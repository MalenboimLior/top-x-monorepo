// Client-side Leaderboard Service (Firestore reads only)
// ----------------------------------------------------
// ✅ Fast, read-only client queries
// ✅ Consistent ordering (score desc, streak desc)
// ✅ Around-user window with correct tiebreaker
// ✅ VIP/friends batched fetch (dedup + missing-safe)
// ✅ Percentile via count() aggregations
// ✅ Cursor-based pagination for Top N
// ✅ Typed results + friendly error surfaces
// ✅ Date index filtering (daily, weekly, monthly, allTime)
//
// Note: You'll need composite indexes for:
// 1) score desc, streak desc (and optionally scope/dailyChallengeId/date index equality filters)
// 2) score asc, streak asc (only if you introduce reverse queries)
// 3) date.indexes.daily/weekly/monthly equality filters combined with score/streak ordering
//
// Collection paths:
// - Global: `games/{gameId}/leaderboard`
// - Daily Challenge: `games/{gameId}/daily_challenges/{dailyChallengeId}/leaderboard`

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit as qLimit,
  startAfter,
  endBefore,
  limitToLast,
  getDocs,
  getDoc,
  doc,
  documentId,
  getCountFromServer,
  type Firestore,
  type Query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { LeaderboardEntry } from '@top-x/shared/types/game';
import { getGame } from './game';

// ----------------------
// Types
// ----------------------
export type { LeaderboardEntry } from '@top-x/shared/types/game';

export type DateRange = 'daily' | 'weekly' | 'monthly' | 'allTime';

export type TopResult = {
  items: LeaderboardEntry[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
  error?: string;
};

export type AroundResult = {
  above: LeaderboardEntry[]; // nearest better-ranked first → farthest
  current: LeaderboardEntry | null;
  below: LeaderboardEntry[]; // nearest worse-ranked first → farthest
  error?: string;
};

export type ListResult = {
  items: LeaderboardEntry[];
  error?: string;
};

export type PercentileResult = {
  user: LeaderboardEntry | null;
  percentile: number | null; // 0..100
  total: number;
  error?: string;
};

// ----------------------
// Helpers
// ----------------------
const db = ((): Firestore => getFirestore())();

/**
 * Builds the collection path for a leaderboard
 */
function getCollectionPath(gameId: string, dailyChallengeId?: string): string {
  if (dailyChallengeId) {
    return `games/${gameId}/daily_challenges/${dailyChallengeId}/leaderboard`;
  }
  return `games/${gameId}/leaderboard`;
}

/**
 * Builds base query with optional filters
 */
function baseQuery(
  collectionPath: string,
  opts?: {
    scope?: string;
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string; // Specific date index value (e.g., '2024-01-15' for daily)
  }
): Query<DocumentData> {
  const constraints: QueryConstraint[] = [];
  
  if (opts?.scope) {
    constraints.push(where('scope', '==', opts.scope));
  }
  
  if (opts?.dailyChallengeId) {
    constraints.push(where('dailyChallengeId', '==', opts.dailyChallengeId));
  }
  
  // Date index filtering
  if (opts?.dateRange && opts.dateRange !== 'allTime') {
    const indexField = `date.indexes.${opts.dateRange}` as const;
    if (opts.dateIndexValue) {
      // Filter by specific date index value
      constraints.push(where(indexField, '==', opts.dateIndexValue));
    } else {
      // For allTime, we don't filter by date index
      // For other ranges, we'd need a specific value to filter
      // This is a placeholder - you may want to compute the current date index
      // based on the dateRange type (daily/weekly/monthly)
    }
  }
  
  return query(collection(db, collectionPath), ...constraints);
}

/**
 * Converts Firestore document to LeaderboardEntry
 */
function toEntry(snap: QueryDocumentSnapshot<DocumentData>): LeaderboardEntry {
  const data = snap.data() as any;
  
  // Handle Firestore Timestamp conversion
  const updatedAt = data.updatedAt
    ? typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt
      ? data.updatedAt.seconds * 1000 + (data.updatedAt.nanoseconds || 0) / 1000000
      : typeof data.updatedAt === 'number'
      ? data.updatedAt
      : undefined
    : data.date?.recordedAt;
  
  return {
    uid: data.uid ?? snap.id,
    displayName: data.displayName || 'Anonymous',
    username: data.username || data.displayName || 'Anonymous',
    photoURL: data.photoURL || 'https://www.top-x.co/assets/profile.png',
    score: data.score ?? 0,
    streak: data.streak ?? 0,
    updatedAt,
    date: data.date,
    custom: data.custom,
  };
}

const ORDER_DESC: QueryConstraint[] = [orderBy('score', 'desc'), orderBy('streak', 'desc')];

function sortLocal(items: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreaker: higher streak first; if missing, treat as 0
    const sa = a.streak ?? 0;
    const sb = b.streak ?? 0;
    if (sb !== sa) return sb - sa;
    // Optional tertiary tiebreaker by updatedAt (earlier wins)
    const ta = a.updatedAt ?? Number.MAX_SAFE_INTEGER;
    const tb = b.updatedAt ?? Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
}

function chunk<T>(arr: T[], size = 10): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Gets the current date index value for a given date range
 */
function getCurrentDateIndex(dateRange: DateRange, date?: Date): string | undefined {
  const d = date || new Date();
  
  switch (dateRange) {
    case 'daily':
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    case 'weekly': {
      const utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNumber = utcDate.getUTCDay() || 7;
      utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
      const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
      const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${utcDate.getUTCFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    }
    case 'monthly':
      return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    case 'allTime':
      return 'all-time';
    default:
      return undefined;
  }
}

// ----------------------
// API
// ----------------------

/**
 * Top N with cursor pagination.
 * 
 * @param gameIdOrPath - Game ID or full collection path
 * @param params - Query parameters
 */
export async function getTopLeaderboard(
  gameIdOrPath: string,
  params?: {
    limit?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
    scope?: string;
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string;
  }
): Promise<TopResult> {
  const { 
    limit = 50, 
    cursor = null, 
    scope, 
    dailyChallengeId,
    dateRange,
    dateIndexValue 
  } = params || {};
  
  try {
    // Build collection path
    const collectionPath = gameIdOrPath.includes('/') 
      ? gameIdOrPath 
      : getCollectionPath(gameIdOrPath, dailyChallengeId);
    
    // Auto-compute date index value if dateRange is provided but dateIndexValue is not
    const finalDateIndexValue = dateRange && !dateIndexValue && dateRange !== 'allTime'
      ? getCurrentDateIndex(dateRange)
      : dateIndexValue;
    
    const q = query(
      baseQuery(collectionPath, { scope, dailyChallengeId, dateRange, dateIndexValue: finalDateIndexValue }),
      ...ORDER_DESC,
      qLimit(limit),
      ...(cursor ? [startAfter(cursor)] : [])
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(toEntry);
    const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1] : null;
    return { items, nextCursor };
  } catch (e: any) {
    return { items: [], nextCursor: null, error: e?.message || 'Failed to load leaderboard' };
  }
}

/**
 * Get neighbors around a user using the same tiebreaker (score desc, streak desc).
 * Returns up to `window` above and `window` below.
 */
export async function getAroundLeaderboard(
  gameIdOrPath: string,
  params: { 
    uid: string; 
    window?: number; 
    scope?: string; 
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string;
  }
): Promise<AroundResult> {
  const { uid, window = 5, scope, dailyChallengeId, dateRange, dateIndexValue } = params;
  
  const collectionPath = gameIdOrPath.includes('/') 
    ? gameIdOrPath 
    : getCollectionPath(gameIdOrPath, dailyChallengeId);
  
  try {
    // 1) Load the user entry
    const userDocRef = doc(collection(db, collectionPath), uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return { above: [], current: null, below: [], error: 'User not on leaderboard' };
    }
    const userEntry = toEntry(userSnap as any);

    // 2) Build ordered base query (same ordering everywhere)
    const finalDateIndexValue = dateRange && !dateIndexValue && dateRange !== 'allTime'
      ? getCurrentDateIndex(dateRange)
      : dateIndexValue;
    
    const bq = query(
      baseQuery(collectionPath, { scope, dailyChallengeId, dateRange, dateIndexValue: finalDateIndexValue }),
      ...ORDER_DESC
    );

    // 3) Above: documents BEFORE the user in this order → closest first
    // For descending order, endBefore with the user's snapshot gets entries with higher scores
    const aboveQ = query(bq, endBefore(userSnap), limitToLast(window));
    const aboveSnap = await getDocs(aboveQ);

    // 4) Below: documents AFTER the user → closest first
    // For descending order, startAfter with the user's snapshot gets entries with lower scores
    const belowQ = query(bq, startAfter(userSnap), qLimit(window));
    const belowSnap = await getDocs(belowQ);

    const above = sortLocal(aboveSnap.docs.map(toEntry));
    const below = sortLocal(belowSnap.docs.map(toEntry));

    return { above, current: userEntry, below };
  } catch (e: any) {
    return { above: [], current: null, below: [], error: e?.message || 'Failed to load neighbors' };
  }
}

/**
 * Fetch specific users (VIP/friends) by UID in batches of 10, then sort client-side
 * with the global comparator (score desc, streak desc).
 */
export async function getUsersLeaderboard(
  gameIdOrPath: string,
  params: { 
    uids: string[]; 
    scope?: string; 
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string;
  }
): Promise<ListResult> {
  const { uids, scope, dailyChallengeId, dateRange, dateIndexValue } = params;
  
  const collectionPath = gameIdOrPath.includes('/') 
    ? gameIdOrPath 
    : getCollectionPath(gameIdOrPath, dailyChallengeId);
  
  try {
    const uniq = Array.from(new Set(uids)).filter(Boolean);
    if (uniq.length === 0) return { items: [] };

    const finalDateIndexValue = dateRange && !dateIndexValue && dateRange !== 'allTime'
      ? getCurrentDateIndex(dateRange)
      : dateIndexValue;
    
    const bq = baseQuery(collectionPath, { scope, dailyChallengeId, dateRange, dateIndexValue: finalDateIndexValue });
    const batches = chunk(uniq, 10);
    const results: LeaderboardEntry[] = [];

    for (const batch of batches) {
      const q = query(bq, where(documentId(), 'in', batch));
      const snap = await getDocs(q);
      results.push(...snap.docs.map(toEntry));
    }

    return { items: sortLocal(results) };
  } catch (e: any) {
    return { items: [], error: e?.message || 'Failed to load users' };
  }
}

/**
 * Compute percentile of the current user among all entries in the (optionally) filtered set.
 * Percentile = 100 * (count of entries with score <= user.score) / (total entries)
 */
export async function getUserPercentile(
  gameIdOrPath: string,
  params: { 
    uid: string; 
    scope?: string; 
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string;
  }
): Promise<PercentileResult> {
  const { uid, scope, dailyChallengeId, dateRange, dateIndexValue } = params;
  
  const collectionPath = gameIdOrPath.includes('/') 
    ? gameIdOrPath 
    : getCollectionPath(gameIdOrPath, dailyChallengeId);
  
  try {
    const userDocRef = doc(collection(db, collectionPath), uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return { user: null, percentile: null, total: 0, error: 'User not on leaderboard' };
    }

    const user = toEntry(userSnap as any);

    const finalDateIndexValue = dateRange && !dateIndexValue && dateRange !== 'allTime'
      ? getCurrentDateIndex(dateRange)
      : dateIndexValue;

    const base = baseQuery(collectionPath, { scope, dailyChallengeId, dateRange, dateIndexValue: finalDateIndexValue });

    const totalAgg = await getCountFromServer(base);
    const total = totalAgg.data().count || 0;

    if (total === 0) return { user, percentile: null, total };

    // Count of entries with score <= user.score
    const atOrBelowAgg = await getCountFromServer(query(base, where('score', '<=', user.score)));
    const atOrBelow = atOrBelowAgg.data().count || 0;

    const percentile = Math.max(0, Math.min(100, Math.round((atOrBelow / total) * 100)));

    return { user, percentile, total };
  } catch (e: any) {
    return { user: null, percentile: null, total: 0, error: e?.message || 'Failed to compute percentile' };
  }
}

/**
 * Fetches leaderboard entries for VIP users of a game
 * Requires fetching the game first to get the VIP list
 */
export async function getVipLeaderboard(
  gameId: string,
  params?: {
    scope?: string;
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string;
  }
): Promise<LeaderboardEntry[]> {
  try {
    // First, get the game to find VIP UIDs
    const gameResult = await getGame(gameId);
    
    if (!gameResult.game) {
      console.warn('getVipLeaderboard: Game not found:', gameId);
      return [];
    }
    
    const vipUids = gameResult.game.vip || [];
    
    if (vipUids.length === 0) {
      return [];
    }
    
    // Fetch leaderboard entries for VIP users
    const result = await getUsersLeaderboard(gameId, {
      uids: vipUids,
      scope: params?.scope,
      dailyChallengeId: params?.dailyChallengeId,
      dateRange: params?.dateRange,
      dateIndexValue: params?.dateIndexValue,
    });
    
    return result.items;
  } catch (e: any) {
    console.error('getVipLeaderboard: Error fetching VIP leaderboard:', e);
    return [];
  }
}

/**
 * Fetches leaderboard entries for a user's friends (frenemies)
 * Fetches the user's profile to get their frenemies list
 */
export async function getFriendsLeaderboard(
  gameId: string,
  userId: string,
  params?: {
    scope?: string;
    dailyChallengeId?: string;
    dateRange?: DateRange;
    dateIndexValue?: string;
  }
): Promise<LeaderboardEntry[]> {
  try {
    // First, get the user's profile to find frenemies
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.warn('getFriendsLeaderboard: User not found:', userId);
      return [];
    }
    
    const userData = userDoc.data();
    const friendUids = userData.frenemies || [];
    
    if (friendUids.length === 0) {
      return [];
    }
    
    // Fetch leaderboard entries for friends
    const result = await getUsersLeaderboard(gameId, {
      uids: friendUids,
      scope: params?.scope,
      dailyChallengeId: params?.dailyChallengeId,
      dateRange: params?.dateRange,
      dateIndexValue: params?.dateIndexValue,
    });
    
    return result.items;
  } catch (e: any) {
    console.error('getFriendsLeaderboard: Error fetching friends leaderboard:', e);
    return [];
  }
}

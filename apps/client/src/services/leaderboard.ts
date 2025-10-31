// apps/client/src/services/leaderboard.ts
import {
  collection,
  doc,
  documentId,
  endBefore,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { LeaderboardEntry } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';

const DEFAULT_GAME_ID = 'smartest_on_x';
const BATCH_SIZE = 10;
const AROUND_WINDOW = 5;

const mapLeaderboardEntry = (
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): LeaderboardEntry => {
  const data = snapshot.data() as Partial<LeaderboardEntry> | undefined;
  const recordedAt = data?.date?.recordedAt;
  const fallbackUpdatedAt = typeof recordedAt === 'number' ? recordedAt : undefined;
  return {
    uid: snapshot.id,
    displayName: data?.displayName || 'Anonymous',
    username: data?.username || data?.displayName || 'Anonymous',
    photoURL: data?.photoURL || 'https://www.top-x.co/assets/profile.png',
    score: data?.score ?? 0,
    streak: data?.streak ?? 0,
    updatedAt: typeof data?.updatedAt === 'number' ? data.updatedAt : fallbackUpdatedAt,
    date: data?.date,
    custom: data?.custom,
  };
};

const getLeaderboardCollection = (gameId: string, dailyChallengeId?: string) => {
  if (dailyChallengeId) {
    return collection(db, 'games', gameId, 'daily_challenges', dailyChallengeId, 'leaderboard');
  }
  return collection(db, 'games', gameId, 'leaderboard');
};

const getStatsDocument = (gameId: string, dailyChallengeId?: string) => {
  if (dailyChallengeId) {
    return doc(db, 'games', gameId, 'daily_challenges', dailyChallengeId, 'stats', 'general');
  }
  return doc(db, 'games', gameId, 'stats', 'general');
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
};

export async function getTopLeaderboard(
  gameId: string = DEFAULT_GAME_ID,
  limitCount: number = 10,
  dailyChallengeId?: string
): Promise<LeaderboardEntry[]> {
  const leaderboardRef = getLeaderboardCollection(gameId, dailyChallengeId);
  const leaderboardQuery = query(
    leaderboardRef,
    orderBy('score', 'desc'),
    orderBy('streak', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(leaderboardQuery);
  return snapshot.docs.map(mapLeaderboardEntry);
}

export async function getAroundLeaderboard(
  gameId: string = DEFAULT_GAME_ID,
  uid: string,
  dailyChallengeId?: string
): Promise<LeaderboardEntry[]> {
  const leaderboardRef = getLeaderboardCollection(gameId, dailyChallengeId);
  const userDocRef = doc(leaderboardRef, uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    return [];
  }

  const baseQuery = query(leaderboardRef, orderBy('score', 'desc'), orderBy('updatedAt', 'desc'));

  const aboveSnapshot = await getDocs(
    query(baseQuery, endBefore(userDoc), limitToLast(AROUND_WINDOW))
  );
  const belowSnapshot = await getDocs(
    query(baseQuery, startAfter(userDoc), limit(AROUND_WINDOW))
  );

  const aboveEntries = aboveSnapshot.docs.map(mapLeaderboardEntry);
  const belowEntries = belowSnapshot.docs.map(mapLeaderboardEntry);
  const currentEntry = mapLeaderboardEntry(userDoc);

  return [...aboveEntries, currentEntry, ...belowEntries];
}

export async function getFriendsLeaderboard(
  gameId: string = DEFAULT_GAME_ID,
  uid: string,
  dailyChallengeId?: string
): Promise<LeaderboardEntry[]> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  const userData = userDoc.data() as { frenemies?: string[] } | undefined;
  const frenemies = userData?.frenemies ?? [];

  if (!frenemies.length) {
    return [];
  }

  const leaderboardRef = getLeaderboardCollection(gameId, dailyChallengeId);
  const leaderboard: LeaderboardEntry[] = [];

  for (const batch of chunkArray(frenemies, BATCH_SIZE)) {
    const snapshot = await getDocs(
      query(leaderboardRef, where(documentId(), 'in', batch))
    );
    snapshot.forEach(docSnapshot => {
      leaderboard.push(mapLeaderboardEntry(docSnapshot));
    });
  }

  return leaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.streak ?? 0) - (a.streak ?? 0);
  });
}

export async function getPercentileRank(
  gameId: string = DEFAULT_GAME_ID,
  uid: string,
  dailyChallengeId?: string
): Promise<{ percentile: number; usersTopped: number }> {
  const leaderboardRef = getLeaderboardCollection(gameId, dailyChallengeId);
  const userDoc = await getDoc(doc(leaderboardRef, uid));

  if (!userDoc.exists()) {
    return { percentile: 0, usersTopped: 0 };
  }

  const userData = userDoc.data() as { score?: number } | undefined;
  const userScore = userData?.score ?? 0;

  const statsDoc = await getDoc(getStatsDocument(gameId, dailyChallengeId));
  const statsData = statsDoc.data() as Partial<GameStats> | undefined;

  const scoreDistribution = statsData?.scoreDistribution ?? {};
  const totalPlayers = typeof statsData?.totalPlayers === 'number' ? statsData.totalPlayers : 0;

  if (totalPlayers === 0) {
    return { percentile: 0, usersTopped: 0 };
  }

  let playersBelowOrEqual = 0;
  for (const [scoreValue, count] of Object.entries(scoreDistribution)) {
    const numericScore = Number(scoreValue);
    if (!Number.isNaN(numericScore) && numericScore <= userScore) {
      playersBelowOrEqual += count;
    }
  }

  const safeTotal = playersBelowOrEqual > totalPlayers ? playersBelowOrEqual : totalPlayers;
  const percentile = safeTotal === 0 ? 0 : Math.round((playersBelowOrEqual / safeTotal) * 100);

  return {
    percentile,
    usersTopped: playersBelowOrEqual,
  };
}

export async function getVipLeaderboard(
  gameId: string = DEFAULT_GAME_ID,
  dailyChallengeId?: string
): Promise<LeaderboardEntry[]> {
  const gameDoc = await getDoc(doc(db, 'games', gameId));
  const gameData = gameDoc.data() as { vip?: string[] } | undefined;
  const vipUids = gameData?.vip ?? [];

  if (!vipUids.length) {
    return [];
  }

  const leaderboardRef = getLeaderboardCollection(gameId, dailyChallengeId);
  const leaderboard: LeaderboardEntry[] = [];

  for (const batch of chunkArray(vipUids, BATCH_SIZE)) {
    const snapshot = await getDocs(
      query(leaderboardRef, where(documentId(), 'in', batch))
    );
    snapshot.forEach(docSnapshot => {
      leaderboard.push(mapLeaderboardEntry(docSnapshot));
    });
  }

  return leaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.streak ?? 0) - (a.streak ?? 0);
  });
}

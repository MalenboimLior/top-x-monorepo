// Client-side Game Service (Firestore reads only)
// ----------------------------------------------------
// ✅ Abstracts Firebase calls for games and daily challenges
// ✅ Provides typed results with error handling
// ✅ Supports both one-time fetches and real-time subscriptions
//
// Collection paths:
// - Games: `games/{gameId}`
// - Game Stats: `games/{gameId}/stats/general`
// - Daily Challenges: `games/{gameId}/daily_challenges/{challengeId}`

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  documentId,
  type Firestore,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@top-x/shared';
import type { Game, GameStats } from '@top-x/shared/types';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { TriviaQuestion } from '@top-x/shared/types/trivia';
import { DateTime } from 'luxon';

// ----------------------
// Types
// ----------------------
export type { Game, GameStats } from '@top-x/shared/types';
export type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';

export type GameResult = {
  game: Game | null;
  error?: string;
};

export type GamesResult = {
  games: Game[];
  error?: string;
};

export type GameStatsResult = {
  stats: Partial<GameStats> | null;
  error?: string;
};

export type DailyChallengeResult = {
  challenge: (DailyChallenge & { id: string }) | null;
  error?: string;
};

export type DailyChallengesResult = {
  challenges: (DailyChallenge & { id: string })[];
  error?: string;
};

// ----------------------
// Helpers
// ----------------------
const db = ((): Firestore => getFirestore())();

/**
 * Converts Firestore timestamp to milliseconds
 */
function timestampToMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === 'object') {
    const maybeTimestamp = value as { seconds?: number; nanoseconds?: number; toMillis?: () => number };
    if (typeof maybeTimestamp.toMillis === 'function') {
      try {
        return maybeTimestamp.toMillis();
      } catch (error) {
        console.warn('Unable to convert timestamp via toMillis', error);
      }
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      const nanos = typeof maybeTimestamp.nanoseconds === 'number' ? maybeTimestamp.nanoseconds : 0;
      return maybeTimestamp.seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }
  return undefined;
}

/**
 * Maps a Firestore document snapshot to a Game object
 */
function mapGameDocument(docSnap: QueryDocumentSnapshot<DocumentData>): Game {
  const data = docSnap.data();
  const createdAt = timestampToMillis(data.createdAt);
  const updatedAt = timestampToMillis(data.updatedAt);
  return {
    id: docSnap.id,
    name: data.name || 'Unnamed Game',
    description: data.description || 'No description available',
    gameTypeId: data.gameTypeId || '',
    active: data.active ?? true, // Default to true for new games
    gameHeader: data.gameHeader,
    gameInstruction: data.gameInstruction,
    shareText: data.shareText,
    image: data.image || '',
    imageGradient: Array.isArray(data.imageGradient) && data.imageGradient.length === 2 
      ? data.imageGradient as [string, string]
      : undefined,
    imageGradientTextColor: data.imageGradientTextColor || undefined,
    language: data.language || 'en',
    shareLink: data.shareLink || '',
    vip: Array.isArray(data.vip) ? data.vip : [],
    badges: Array.isArray(data.badges) ? data.badges : undefined,
    unlisted: data.unlisted ?? false,
    custom: data.custom || {},
    creator: data.creator,
    community: data.community ?? false,
    hideFromHome: data.hideFromHome ?? false,
    dailyChallengeActive: data.dailyChallengeActive,
    dailyChallengeCurrent: data.dailyChallengeCurrent,
    leaderboard: data.leaderboard,
    createdAt,
    updatedAt,
  } as Game;
}

/**
 * Maps a Firestore document snapshot to a DailyChallenge object
 */
function mapDailyChallengeDocument(docSnap: QueryDocumentSnapshot<DocumentData>): DailyChallenge & { id: string } {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    number: data.number ?? 0,
    date: data.date || '',
    createdAt: data.createdAt || '',
    schedule: data.schedule || {
      availableAt: '',
      closesAt: '',
      revealAt: '',
    },
    custom: data.custom || {},
    showCountdown: data.showCountdown,
    difficulty: data.difficulty,
    category: data.category,
    shareText: data.shareText,
    discussionUrl: data.discussionUrl,
    analytics: data.analytics,
    leaderboardSummary: data.leaderboardSummary,
    isArchived: data.isArchived,
    isFeatured: data.isFeatured,
  } as DailyChallenge & { id: string };
}

/**
 * Checks if a daily challenge is currently active
 */
function isChallengeActive(challenge: DailyChallenge & { id: string }, now: DateTime): boolean {
  const schedule = challenge?.schedule;
  if (!schedule) return false;

  const availableAt = DateTime.fromISO(schedule.availableAt, { zone: 'utc' });
  if (availableAt.isValid && availableAt > now) {
    return false;
  }

  const closesAt = DateTime.fromISO(schedule.closesAt, { zone: 'utc' });
  if (closesAt.isValid && closesAt <= now) {
    return false;
  }

  return true;
}

// ----------------------
// Games API
// ----------------------

/**
 * Fetches a single game by ID
 */
export async function getGame(gameId: string): Promise<GameResult> {
  try {
    const gameDocRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameDocRef);

    if (!gameDoc.exists()) {
      return { game: null, error: 'Game not found' };
    }

    const game = mapGameDocument(gameDoc);
    return { game };
  } catch (e: any) {
    return { game: null, error: e?.message || 'Failed to load game' };
  }
}

/**
 * Batch fetches multiple games by IDs (optimized for reading multiple games)
 * Firestore 'in' query supports up to 10 items per query
 */
export async function getGamesBatch(gameIds: string[]): Promise<Map<string, Game>> {
  const result = new Map<string, Game>();
  
  if (gameIds.length === 0) {
    return result;
  }

  // Firestore 'in' queries support up to 10 items
  const BATCH_SIZE = 10;
  const batches: string[][] = [];
  
  for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
    batches.push(gameIds.slice(i, i + BATCH_SIZE));
  }

  try {
    const batchPromises = batches.map(async (batchIds) => {
      // Use 'in' query to fetch multiple games at once
      const gamesQuery = query(
        collection(db, 'games'),
        where(documentId(), 'in', batchIds)
      );
      const snapshot = await getDocs(gamesQuery);
      
      snapshot.forEach((docSnap) => {
        const game = mapGameDocument(docSnap);
        result.set(docSnap.id, game);
      });
    });

    await Promise.all(batchPromises);
  } catch (e: any) {
    console.error('Error batch fetching games:', e?.message || e);
  }

  return result;
}

/**
 * Fetches all games (with optional filters)
 */
export async function getGames(options?: {
  activeOnly?: boolean;
  dailyChallengeActive?: boolean;
  creatorUserId?: string;
}): Promise<GamesResult> {
  try {
    const constraints: any[] = [];

    if (options?.activeOnly) {
      constraints.push(where('active', '==', true));
    }

    if (options?.dailyChallengeActive) {
      constraints.push(where('dailyChallengeActive', '==', true));
    }

    if (options?.creatorUserId) {
      constraints.push(where('creator.userid', '==', options.creatorUserId));
    }

    const gamesQuery = constraints.length > 0
      ? query(collection(db, 'games'), ...constraints)
      : query(collection(db, 'games'));

    const snapshot = await getDocs(gamesQuery);
    const games = snapshot.docs
      .map((docSnap) => mapGameDocument(docSnap))
      .filter((g) => !options?.activeOnly || g.active);

    return { games };
  } catch (e: any) {
    return { games: [], error: e?.message || 'Failed to load games' };
  }
}


/**
 * Fetches game stats for a specific game
 */
export async function getGameStats(gameId: string): Promise<GameStatsResult> {
  try {
    const statsDocRef = doc(db, 'games', gameId, 'stats', 'general');
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      return { stats: null };
    }

    const stats = statsDoc.data() as Partial<GameStats>;
    return { stats };
  } catch (e: any) {
    return { stats: null, error: e?.message || 'Failed to load game stats' };
  }
}


// ----------------------
// Daily Challenges API
// ----------------------

/**
 * Fetches a single daily challenge by ID
 */
export async function getDailyChallenge(
  gameId: string,
  challengeId: string
): Promise<DailyChallengeResult> {
  try {
    const challengeDocRef = doc(db, 'games', gameId, 'daily_challenges', challengeId);
    const snapshot = await getDoc(challengeDocRef);

    if (!snapshot.exists()) {
      return { challenge: null, error: 'Daily challenge not found' };
    }

    const challenge = mapDailyChallengeDocument(snapshot);
    return { challenge };
  } catch (e: any) {
    return { challenge: null, error: e?.message || 'Failed to load daily challenge' };
  }
}

/**
 * Fetches all daily challenges for a game
 */
export async function getDailyChallenges(gameId: string): Promise<DailyChallengesResult> {
  try {
    const challengesRef = collection(db, 'games', gameId, 'daily_challenges');
    const snapshot = await getDocs(challengesRef);

    const challenges = snapshot.docs.map((docSnap) => mapDailyChallengeDocument(docSnap));
    return { challenges };
  } catch (e: any) {
    return { challenges: [], error: e?.message || 'Failed to load daily challenges' };
  }
}

/**
 * Finds the currently active daily challenge for a game
 * Optionally falls back to a specific challenge ID if provided
 */
export async function getActiveDailyChallenge(
  gameId: string,
  fallbackId?: string
): Promise<DailyChallengeResult> {
  const now = DateTime.utc();
  const nowISO = now.toISO();

  if (!nowISO) {
    return { challenge: null, error: 'Invalid current time' };
  }

  try {
    const challengesRef = collection(db, 'games', gameId, 'daily_challenges');
    const activeQuery = query(
      challengesRef,
      where('schedule.availableAt', '<=', nowISO),
      orderBy('schedule.availableAt', 'desc'),
      limit(5)
    );
    const snapshot = await getDocs(activeQuery);

    for (const docSnap of snapshot.docs) {
      const challenge = mapDailyChallengeDocument(docSnap);
      if (isChallengeActive(challenge, now)) {
        return { challenge };
      }
    }

    // Try fallback if provided
    if (fallbackId) {
      const fallbackResult = await getDailyChallenge(gameId, fallbackId);
      if (fallbackResult.challenge && isChallengeActive(fallbackResult.challenge, now)) {
        return fallbackResult;
      }
    }

    return { challenge: null, error: 'No active daily challenge found' };
  } catch (e: any) {
    return { challenge: null, error: e?.message || 'Failed to find active daily challenge' };
  }
}

// ----------------------
// Game Write Operations
// ----------------------

export type CreateGameResult = {
  gameId: string | null;
  error?: string;
};

export type UpdateGameResult = {
  success: boolean;
  error?: string;
};

export type DeleteGameResult = {
  success: boolean;
  error?: string;
};

/**
 * Recursively removes empty string fields from an object.
 * Firestore doesn't allow empty string fields in documents.
 * This function does a deep clean, removing all empty strings at any nesting level.
 */
function removeEmptyStrings(obj: any, path: string = 'root'): any {
  // Handle primitives
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle strings - return null if empty (will be filtered out)
  if (typeof obj === 'string') {
    if (obj === '') {
      console.log(`[removeEmptyStrings] Found empty string at: ${path}`);
      return null; // Return null so it gets filtered out
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const cleaned = obj
      .map((item, index) => removeEmptyStrings(item, `${path}[${index}]`))
      .filter(item => {
        // Remove null/undefined (which includes empty strings we converted to null)
        if (item === null || item === undefined) {
          return false;
        }
        // Remove empty objects
        if (typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) {
          return false;
        }
        // Keep empty arrays (Firestore allows them, but we can remove them if desired)
        // Actually, let's keep them for now
        return true;
      });
    return cleaned;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path === 'root' ? key : `${path}.${key}`;
      
      // Skip empty string KEYS - Firestore doesn't allow empty field names
      if (key === '') {
        console.log(`[removeEmptyStrings] Skipping empty key at: ${fieldPath} (value: ${JSON.stringify(value)})`);
        continue;
      }
      
      // Skip empty string VALUES - this is critical for Firestore
      if (value === '') {
        console.log(`[removeEmptyStrings] Skipping empty string at: ${fieldPath}`);
        continue;
      }
      
      // Recursively clean nested structures
      const cleanedValue = removeEmptyStrings(value, fieldPath);
      
      // Skip null/undefined (includes empty strings converted to null)
      if (cleanedValue === null || cleanedValue === undefined) {
        continue;
      }
      
      // Skip empty objects
      if (typeof cleanedValue === 'object' && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0) {
        console.log(`[removeEmptyStrings] Skipping empty object at: ${fieldPath}`);
        continue;
      }
      
      // Special case: if cleanedValue is a string, double-check it's not empty
      if (typeof cleanedValue === 'string' && cleanedValue === '') {
        console.log(`[removeEmptyStrings] WARNING: Found empty string after cleaning at: ${fieldPath}`);
        continue;
      }
      
      // Include the cleaned value
      cleaned[key] = cleanedValue;
    }
    return cleaned;
  }

  // For any other type (number, boolean, etc.), return as-is
  return obj;
}

/**
 * Deep validation to find any remaining empty strings (both keys and values) in the data
 */
function findEmptyStrings(obj: any, path: string = 'root'): string[] {
  const emptyPaths: string[] = [];
  if (obj === null || obj === undefined) return emptyPaths;
  
  if (typeof obj === 'string' && obj === '') {
    emptyPaths.push(`${path} (empty value)`);
    return emptyPaths;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      emptyPaths.push(...findEmptyStrings(item, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Check for empty string KEYS
      if (key === '') {
        emptyPaths.push(`${path}[""] (empty key with value: ${JSON.stringify(value).substring(0, 50)})`);
        continue;
      }
      const fieldPath = path === 'root' ? key : `${path}.${key}`;
      emptyPaths.push(...findEmptyStrings(value, fieldPath));
    }
  }
  
  return emptyPaths;
}

/**
 * Ultra-aggressive cleaning using JSON serialization to catch all empty strings
 */
function ultraCleanData(obj: any): any {
  // Use JSON serialization with a replacer to remove empty strings
  const cleaned = JSON.parse(
    JSON.stringify(obj, (key, value) => {
      // Remove empty strings completely
      if (value === '') {
        return undefined; // undefined values are omitted from JSON
      }
      return value;
    })
  );
  
  // Then do a final pass with removeEmptyStrings to handle any edge cases
  return removeEmptyStrings(cleaned);
}

/**
 * Creates a new game in Firestore
 */
export async function createGame(gameData: Omit<Game, 'id'>): Promise<CreateGameResult> {
  try {
    console.log('[createGame] Original data keys:', Object.keys(gameData));

    // Add timestamps
    const now = Date.now();
    const dataWithTimestamps = {
      ...gameData,
      createdAt: now,
      updatedAt: now,
    };

    // Remove empty strings before saving to Firestore
    const cleanedData = removeEmptyStrings(dataWithTimestamps);
    console.log('[createGame] Cleaned data keys:', Object.keys(cleanedData));
    
    // Final validation: find any remaining empty strings
    const emptyStringPaths = findEmptyStrings(cleanedData);
    if (emptyStringPaths.length > 0) {
      console.error('[createGame] ERROR: Found empty strings at paths:', emptyStringPaths);
      console.error('[createGame] Full cleaned data:', JSON.stringify(cleanedData, null, 2));
      // Remove the problematic fields
      for (const path of emptyStringPaths) {
        console.error(`[createGame] Attempting to remove empty string at: ${path}`);
      }
      // Try one more pass
      const reCleanedData = removeEmptyStrings(cleanedData);
      const reEmptyStringPaths = findEmptyStrings(reCleanedData);
      if (reEmptyStringPaths.length > 0) {
        console.error('[createGame] ERROR: Still found empty strings after second pass:', reEmptyStringPaths);
        return { gameId: null, error: `Cannot save: found empty strings at ${reEmptyStringPaths.join(', ')}` };
      }
      // Use the re-cleaned data
      const gameRef = await addDoc(collection(db, 'games'), reCleanedData);
      return { gameId: gameRef.id };
    }
    
    const gameRef = await addDoc(collection(db, 'games'), cleanedData);
    return { gameId: gameRef.id };
  } catch (e: any) {
    console.error('[createGame] Error:', e);
    console.error('[createGame] Error details:', {
      message: e?.message,
      code: e?.code,
      stack: e?.stack,
    });
    return { gameId: null, error: e?.message || 'Failed to create game' };
  }
}

/**
 * Updates an existing game in Firestore
 */
export async function updateGame(gameId: string, gameData: Partial<Omit<Game, 'id'>>): Promise<UpdateGameResult> {
  try {
    console.log('[updateGame] Original data keys:', Object.keys(gameData));

    // Add updatedAt timestamp
    const dataWithTimestamps = {
      ...gameData,
      updatedAt: Date.now(),
    };

    // Remove empty strings before saving to Firestore - do multiple passes to be sure
    let cleanedData = removeEmptyStrings(dataWithTimestamps);
    console.log('[updateGame] After first pass, cleaned data keys:', Object.keys(cleanedData));
    
    // Do a second pass to catch any that might have been missed
    cleanedData = removeEmptyStrings(cleanedData);
    console.log('[updateGame] After second pass, cleaned data keys:', Object.keys(cleanedData));
    
    // Do an ultra-aggressive third pass using JSON serialization
    cleanedData = ultraCleanData(cleanedData);
    console.log('[updateGame] After ultra-clean pass, cleaned data keys:', Object.keys(cleanedData));
    
    // Final validation: find any remaining empty strings
    const emptyStringPaths = findEmptyStrings(cleanedData);
    console.log('[updateGame] Validation check - empty string paths found:', emptyStringPaths.length);
    if (emptyStringPaths.length > 0) {
      console.error('[updateGame] ERROR: Found empty strings at paths:', emptyStringPaths);
      console.error('[updateGame] First 3 empty string paths:', emptyStringPaths.slice(0, 3));
      // Try one more aggressive pass
      cleanedData = removeEmptyStrings(cleanedData);
      const reEmptyStringPaths = findEmptyStrings(cleanedData);
      if (reEmptyStringPaths.length > 0) {
        console.error('[updateGame] ERROR: Still found empty strings after third pass:', reEmptyStringPaths);
        console.error('[updateGame] Sample of problematic data:', JSON.stringify(cleanedData, (key, value) => {
          if (value === '') {
            return '[EMPTY_STRING]';
          }
          return value;
        }, 2).substring(0, 2000));
        return { success: false, error: `Cannot save: found empty strings at ${reEmptyStringPaths.slice(0, 5).join(', ')}...` };
      }
    }
    
    // One final check - serialize and check for empty strings in the JSON
    const serialized = JSON.stringify(cleanedData);
    if (serialized.includes('""')) {
      console.error('[updateGame] WARNING: Found empty strings in serialized JSON!');
      // Find them
      const matches = serialized.match(/"[^"]*":\s*""/g);
      if (matches) {
        console.error('[updateGame] Empty string fields in JSON:', matches.slice(0, 10));
      }
    }
    
    console.log('[updateGame] Attempting to save to Firestore...');
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, cleanedData);
    console.log('[updateGame] Successfully saved!');
    return { success: true };
  } catch (e: any) {
    console.error('[updateGame] Error:', e);
    console.error('[updateGame] Error details:', {
      message: e?.message,
      code: e?.code,
      stack: e?.stack,
    });
    
    // If it's an empty string error, try to find what we missed
    if (e?.message?.includes('must not be empty')) {
      console.error('[updateGame] Firestore empty string error - doing emergency deep clean...');
      // Try one more time with ultra-aggressive cleaning
      try {
        const emergencyCleaned1 = removeEmptyStrings(gameData);
        const emergencyCleaned2 = removeEmptyStrings(emergencyCleaned1);
        const emergencyCleaned3 = ultraCleanData(emergencyCleaned2);
        const finalEmptyPaths = findEmptyStrings(emergencyCleaned3);
        console.error('[updateGame] After emergency clean, remaining empty paths:', finalEmptyPaths);
        if (finalEmptyPaths.length === 0) {
          console.log('[updateGame] Retrying with emergency cleaned data...');
          const gameRef = doc(db, 'games', gameId);
          await updateDoc(gameRef, emergencyCleaned3);
          console.log('[updateGame] Emergency retry succeeded!');
          return { success: true };
        } else {
          console.error('[updateGame] Emergency clean still has empty strings:', finalEmptyPaths.slice(0, 5));
        }
      } catch (retryError: any) {
        console.error('[updateGame] Emergency retry also failed:', retryError);
      }
    }
    
    return { success: false, error: e?.message || 'Failed to update game' };
  }
}

/**
 * Deletes a game from Firestore
 */
export async function deleteGame(gameId: string): Promise<DeleteGameResult> {
  try {
    const gameRef = doc(db, 'games', gameId);
    await deleteDoc(gameRef);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to delete game' };
  }
}

// ----------------------
// Question Pool Operations
// ----------------------

export type SaveQuestionResult = {
  success: boolean;
  error?: string;
};

/**
 * Saves a question to a game's question pool
 */
export async function saveQuestionToGamePool(
  gameId: string,
  question: TriviaQuestion
): Promise<SaveQuestionResult> {
  try {
    if (!question.id) {
      return { success: false, error: 'Question must have an id' };
    }
    const questionRef = doc(collection(db, 'games', gameId, 'questions'), question.id);
    await setDoc(questionRef, question, { merge: true });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to save question to game pool' };
  }
}

/**
 * Saves a question to the global xAI questions pool
 */
export async function saveQuestionToGlobalPool(question: TriviaQuestion): Promise<SaveQuestionResult> {
  try {
    if (!question.id) {
      return { success: false, error: 'Question must have an id' };
    }
    const questionRef = doc(collection(db, 'xaiQuestions'), question.id);
    await setDoc(questionRef, question, { merge: true });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to save question to global pool' };
  }
}

// ----------------------
// xAI Integration
// ----------------------

export type RequestXaiQuestionsParams = {
  gameId?: string;
  language?: string;
  existingIds: string[];
};

export type RequestXaiQuestionsResult = {
  questions: TriviaQuestion[];
  error?: string;
};

/**
 * Requests trivia questions from xAI via Cloud Function
 */
export async function requestXaiTriviaQuestions(
  params: RequestXaiQuestionsParams
): Promise<RequestXaiQuestionsResult> {
  try {
    const callable = httpsCallable<RequestXaiQuestionsParams, { questions?: TriviaQuestion[] }>(
      functions,
      'requestXaiTriviaQuestions'
    );
    const { data } = await callable(params);
    return { questions: data.questions ?? [] };
  } catch (e: any) {
    return { questions: [], error: e?.message || 'Failed to request questions from xAI' };
  }
}


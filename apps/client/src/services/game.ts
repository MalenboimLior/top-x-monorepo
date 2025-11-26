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
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  type Firestore,
  type Unsubscribe,
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
    active: data.active ?? false,
    gameHeader: data.gameHeader,
    gameInstruction: data.gameInstruction,
    shareText: data.shareText,
    image: data.image || '',
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
 * Subscribes to real-time updates for all games
 * Returns an unsubscribe function
 */
export function subscribeToGames(
  callback: (games: Game[], error?: string) => void,
  options?: {
    activeOnly?: boolean;
  }
): Unsubscribe {
  const gamesQuery = query(collection(db, 'games'));

  return onSnapshot(
    gamesQuery,
    (snapshot) => {
      const games = snapshot.docs
        .map((docSnap) => mapGameDocument(docSnap))
        .filter((g) => !options?.activeOnly || g.active);
      callback(games);
    },
    (err) => {
      console.error('Error subscribing to games:', err);
      callback([], err.message);
    }
  );
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

/**
 * Subscribes to real-time updates for game stats
 * Returns an unsubscribe function
 */
export function subscribeToGameStats(
  gameId: string,
  callback: (stats: Partial<GameStats> | null, error?: string) => void
): Unsubscribe {
  const statsDocRef = doc(db, 'games', gameId, 'stats', 'general');

  return onSnapshot(
    statsDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const stats = snapshot.data() as Partial<GameStats>;
        callback(stats);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('Error subscribing to game stats:', err);
      callback(null, err.message);
    }
  );
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
 * Creates a new game in Firestore
 */
export async function createGame(gameData: Omit<Game, 'id'>): Promise<CreateGameResult> {
  try {
    const gameRef = await addDoc(collection(db, 'games'), gameData);
    return { gameId: gameRef.id };
  } catch (e: any) {
    return { gameId: null, error: e?.message || 'Failed to create game' };
  }
}

/**
 * Updates an existing game in Firestore
 */
export async function updateGame(gameId: string, gameData: Partial<Omit<Game, 'id'>>): Promise<UpdateGameResult> {
  try {
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, gameData);
    return { success: true };
  } catch (e: any) {
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


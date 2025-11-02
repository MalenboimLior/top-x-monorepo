import * as admin from 'firebase-admin';
import type { GameStats } from '@top-x/shared/types/stats';
import type { UserGameCustomData } from '@top-x/shared/types/user';

export const createEmptyGameStats = (): GameStats => ({
  totalPlayers: 0,
  sessionsPlayed: 0,
  uniqueSubmitters: 0,
  favorites: 0,
  scoreDistribution: {},
  updatedAt: Date.now(),
  custom: {},
});

export const normalizeGameStats = (
  raw?: FirebaseFirestore.DocumentData | Partial<GameStats>,
): GameStats => {
  const base = createEmptyGameStats();
  if (!raw) {
    return base;
  }

  const stats = raw as Partial<GameStats>;
  const normalizedDistribution: GameStats['scoreDistribution'] = {};
  const rawDistribution = stats.scoreDistribution as Record<string, number> | undefined;

  if (rawDistribution) {
    Object.entries(rawDistribution).forEach(([scoreKey, count]) => {
      const numericScore = Number(scoreKey);
      if (!Number.isNaN(numericScore)) {
        normalizedDistribution[numericScore] = Number.isFinite(count) ? count : 0;
      }
    });
  }

  const normalized: GameStats = {
    totalPlayers: typeof stats.totalPlayers === 'number' ? stats.totalPlayers : base.totalPlayers,
    sessionsPlayed: typeof stats.sessionsPlayed === 'number' ? stats.sessionsPlayed : base.sessionsPlayed,
    uniqueSubmitters: typeof stats.uniqueSubmitters === 'number' ? stats.uniqueSubmitters : base.uniqueSubmitters,
    favorites: typeof stats.favorites === 'number' ? stats.favorites : base.favorites,
    scoreDistribution: normalizedDistribution,
    updatedAt: typeof stats.updatedAt === 'number' ? stats.updatedAt : base.updatedAt,
    custom: stats.custom ? { ...stats.custom } : {},
    totalAttempts: typeof stats.totalAttempts === 'number' ? stats.totalAttempts : undefined,
    correctAttempts: typeof stats.correctAttempts === 'number' ? stats.correctAttempts : undefined,
    averageSolveTimeSec: typeof stats.averageSolveTimeSec === 'number' ? stats.averageSolveTimeSec : undefined,
  };

  return normalized;
};

export const hasMeaningfulCustomData = (custom?: Record<string, unknown>): boolean => {
  if (!custom) {
    return false;
  }

  return Object.entries(custom).some(([key, value]) => {
    if (key === 'dailyChallenges') {
      return false;
    }

    if (value === null || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return true;
  });
};

export type PyramidTier = { tier: number; slots: (string | null)[] };
export type PyramidWorstItem = { id?: string | null };

export type PyramidCustomData = {
  pyramid?: PyramidTier[];
  worstItem?: PyramidWorstItem;
};

export const isPyramidTier = (value: unknown): value is PyramidTier => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tierRecord = value as Record<string, unknown>;
  const slots = tierRecord.slots;

  return (
    typeof tierRecord.tier === 'number'
    && Array.isArray(slots)
    && slots.every((slot) => slot === null || typeof slot === 'string')
  );
};

export const isPyramidCustomData = (value: unknown): value is PyramidCustomData => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const { pyramid, worstItem } = record as PyramidCustomData;

  if (
    pyramid !== undefined
    && (!Array.isArray(pyramid) || !pyramid.every(isPyramidTier))
  ) {
    return false;
  }

  if (
    worstItem !== undefined
    && (typeof worstItem !== 'object' || worstItem === null)
  ) {
    return false;
  }

  return true;
};

export const hasPyramidCustomChanges = (
  previousCustom?: Record<string, any>,
  newCustom?: Record<string, any>
): boolean => {
  const previousPyramid = previousCustom?.pyramid ?? [];
  const newPyramid = newCustom?.pyramid ?? [];
  const previousWorstItem = previousCustom?.worstItem ?? null;
  const newWorstItem = newCustom?.worstItem ?? null;

  return (
    JSON.stringify(previousPyramid) !== JSON.stringify(newPyramid) ||
    JSON.stringify(previousWorstItem) !== JSON.stringify(newWorstItem)
  );
};

export const getStatsDocumentRef = (
  gameId: string,
  dailyChallengeId?: string,
): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> => {
  const db = admin.firestore();
  if (dailyChallengeId) {
    return db
      .collection('games')
      .doc(gameId)
      .collection('daily_challenges')
      .doc(dailyChallengeId)
      .collection('stats')
      .doc('general');
  }
  return db.collection('games').doc(gameId).collection('stats').doc('general');
};


import * as admin from 'firebase-admin';
import type {
  LeaderboardDateIndexes,
  LeaderboardEntry,
  LeaderboardEntryDate,
} from '@top-x/shared/types/game';

const db = admin.firestore();

export const DEFAULT_LEADERBOARD_PHOTO = 'https://www.top-x.co/assets/profile.png';

export const formatLeaderboardDailyIndex = (date: Date): string => date.toISOString().slice(0, 10);

export const formatLeaderboardWeeklyIndex = (date: Date): string => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

export const formatLeaderboardMonthlyIndex = (date: Date): string => {
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
};

export const createLeaderboardDatePayload = (timestamp: number | null | undefined): LeaderboardEntryDate | undefined => {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return undefined;
  }
  const normalizedTimestamp = Math.floor(timestamp);
  const date = new Date(normalizedTimestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  const indexes: LeaderboardDateIndexes = {
    daily: formatLeaderboardDailyIndex(date),
    weekly: formatLeaderboardWeeklyIndex(date),
    monthly: formatLeaderboardMonthlyIndex(date),
    allTime: 'all-time',
  };
  return {
    recordedAt: date.getTime(),
    indexes,
  };
};

export const parseDateLikeValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isNaN(millis) ? undefined : millis;
  }
  return undefined;
};

export const mapLeaderboardDoc = (
  docSnapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    | FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
): LeaderboardEntry => {
  const data = docSnapshot.data() as LeaderboardEntry | undefined;
  const fallbackUpdatedAt = data?.date?.recordedAt;
  return {
    uid: docSnapshot.id,
    displayName: data?.displayName || 'Anonymous',
    username: data?.username || data?.displayName || 'Anonymous',
    photoURL: data?.photoURL || DEFAULT_LEADERBOARD_PHOTO,
    score: data?.score ?? 0,
    streak: data?.streak ?? 0,
    updatedAt: data?.updatedAt ?? fallbackUpdatedAt,
    date: data?.date,
    custom: data?.custom,
  } satisfies LeaderboardEntry;
};

export const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export const getLeaderboardCollectionRef = (
  gameId: string,
  dailyChallengeId?: string,
): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> => {
  const gameRef = db.collection('games').doc(gameId);
  if (dailyChallengeId) {
    return gameRef
      .collection('daily_challenges')
      .doc(dailyChallengeId)
      .collection('leaderboard');
  }
  return gameRef.collection('leaderboard');
};


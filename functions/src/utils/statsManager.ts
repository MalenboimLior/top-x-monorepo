import * as admin from 'firebase-admin';

export const GAME_COUNTER_KEYS = {
  TOTAL_PLAYERS: 'totalPlayers',
  FAVORITES: 'favoriteCounter',
  SESSIONS_PLAYED: 'sessionsPlayed',
  UPDATED_AT: 'updatedAt',
} as const;

type GameCounterField = typeof GAME_COUNTER_KEYS[keyof typeof GAME_COUNTER_KEYS];
export type GameCounterKey = Exclude<GameCounterField, typeof GAME_COUNTER_KEYS.UPDATED_AT>;

type CounterIncrementMap = Partial<Record<GameCounterKey, number>>;

const normalizeIncrements = (increments?: CounterIncrementMap): Record<GameCounterKey, number> => {
  const result: Record<GameCounterKey, number> = {} as Record<GameCounterKey, number>;
  if (!increments) {
    return result;
  }

  Object.entries(increments).forEach(([key, value]) => {
    if (typeof value !== 'number' || value === 0) {
      return;
    }

    result[key as GameCounterKey] = value;
  });

  return result;
};

const buildIncrementPayload = (
  increments: Record<GameCounterKey, number>,
  options: { prefix?: string; updatedAtField: string },
): Record<string, FirebaseFirestore.FieldValue | number> => {
  const payload: Record<string, FirebaseFirestore.FieldValue | number> = {};
  const prefix = options.prefix ?? '';

  Object.entries(increments).forEach(([field, amount]) => {
    payload[`${prefix}${field}`] = admin.firestore.FieldValue.increment(amount);
  });

  payload[options.updatedAtField] = Date.now();

  return payload;
};

const setIncrementPayload = (
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  increments: CounterIncrementMap | undefined,
  options: { prefix?: string; updatedAtField: string },
): void => {
  const normalized = normalizeIncrements(increments);
  if (Object.keys(normalized).length === 0) {
    return;
  }

  tx.set(ref, buildIncrementPayload(normalized, options), { merge: true });
};

export const incrementGameCounters = ({
  tx,
  statsRef,
  increments,
}: {
  tx: FirebaseFirestore.Transaction;
  statsRef: FirebaseFirestore.DocumentReference;
  increments: CounterIncrementMap;
}): void => {
  setIncrementPayload(tx, statsRef, increments, { updatedAtField: GAME_COUNTER_KEYS.UPDATED_AT });
};

export const increaseSessionCounter = ({
  tx,
  statsRef,
  amount = 1,
}: {
  tx: FirebaseFirestore.Transaction;
  statsRef: FirebaseFirestore.DocumentReference;
  amount?: number;
}): void => {
  incrementGameCounters({
    tx,
    statsRef,
    increments: { [GAME_COUNTER_KEYS.SESSIONS_PLAYED]: amount },
  });
};

export const incrementTotalPlayersCounter = ({
  tx,
  statsRef,
  amount = 1,
}: {
  tx: FirebaseFirestore.Transaction;
  statsRef: FirebaseFirestore.DocumentReference;
  amount?: number;
}): void => {
  incrementGameCounters({
    tx,
    statsRef,
    increments: { [GAME_COUNTER_KEYS.TOTAL_PLAYERS]: amount },
  });
};

export const adjustFavoriteCounter = ({
  tx,
  statsRef,
  amount,
}: {
  tx: FirebaseFirestore.Transaction;
  statsRef: FirebaseFirestore.DocumentReference;
  amount: number;
}): void => {
  if (!amount) {
    return;
  }

  incrementGameCounters({
    tx,
    statsRef,
    increments: { [GAME_COUNTER_KEYS.FAVORITES]: amount },
  });
};

export const incrementChallengeAnalyticsCounters = ({
  tx,
  challengeRef,
  increments,
}: {
  tx: FirebaseFirestore.Transaction;
  challengeRef: FirebaseFirestore.DocumentReference;
  increments: CounterIncrementMap;
}): void => {
  setIncrementPayload(tx, challengeRef, increments, {
    prefix: 'analytics.',
    updatedAtField: 'analytics.updatedAt',
  });
};

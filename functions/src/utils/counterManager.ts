import * as admin from 'firebase-admin';
import type { DailyChallengeUserProgress, User } from '@top-x/shared/types/user';

export const GAME_COUNTER_KEYS = {
  TOTAL_PLAYERS: 'totalPlayers',
  FAVORITES: 'favorites',
  SESSIONS_PLAYED: 'sessionsPlayed',
  UNIQUE_SUBMITTERS: 'uniqueSubmitters',
  UPDATED_AT: 'updatedAt',
} as const;

export type GameCounterKey = typeof GAME_COUNTER_KEYS[keyof typeof GAME_COUNTER_KEYS];

export type CounterUpdate =
  | { key: GameCounterKey; type: 'increment'; amount?: number }
  | { key: GameCounterKey; type: 'unique'; amount?: number }
  | { key: GameCounterKey; type: 'toggle'; value: boolean };

interface ApplyGameCounterUpdatesParams {
  tx: FirebaseFirestore.Transaction;
  userRef: FirebaseFirestore.DocumentReference;
  gameRef: FirebaseFirestore.DocumentReference;
  userData: User;
  gameId: string;
  updates: CounterUpdate[];
}

interface ApplyChallengeCounterUpdatesParams {
  tx: FirebaseFirestore.Transaction;
  challengeRef: FirebaseFirestore.DocumentReference;
  counterState?: DailyChallengeUserProgress['counters'];
  updates: CounterUpdate[];
}

const buildUserEngagementUpdate = (
  gameId: string,
  updates: Record<string, boolean>,
): Record<string, boolean> => {
  const payload: Record<string, boolean> = {};
  Object.entries(updates).forEach(([counterKey, value]) => {
    payload[`engagement.games.${gameId}.${counterKey}`] = value;
  });
  return payload;
};

const buildCounterIncrementUpdate = (
  increments: Record<string, number>,
): Record<string, FirebaseFirestore.FieldValue | number> => {
  const payload: Record<string, FirebaseFirestore.FieldValue | number> = {};
  Object.entries(increments).forEach(([counterKey, amount]) => {
    payload[`counters.${counterKey}`] = admin.firestore.FieldValue.increment(amount);
  });
  payload[`counters.${GAME_COUNTER_KEYS.UPDATED_AT}`] = Date.now();
  return payload;
};

const buildChallengeAnalyticsIncrementUpdate = (
  increments: Record<string, number>,
): Record<string, FirebaseFirestore.FieldValue | string> => {
  const payload: Record<string, FirebaseFirestore.FieldValue | string> = {};
  Object.entries(increments).forEach(([counterKey, amount]) => {
    payload[`analytics.${counterKey}`] = admin.firestore.FieldValue.increment(amount);
  });
  payload['analytics.updatedAt'] = new Date().toISOString();
  return payload;
};

export const applyGameCounterUpdates = ({
  tx,
  userRef,
  gameRef,
  userData,
  gameId,
  updates,
}: ApplyGameCounterUpdatesParams): void => {
  if (!updates.length) {
    return;
  }

  const engagementState = {
    ...(userData.engagement?.games?.[gameId] || {}),
  } as Record<string, boolean>;

  const engagementUpdates: Record<string, boolean> = {};
  const counterIncrements: Record<string, number> = {};

  updates.forEach((update) => {
    const amount = update.type === 'toggle' ? 1 : update.amount ?? 1;

    if (update.type === 'increment') {
      counterIncrements[update.key] = (counterIncrements[update.key] || 0) + amount;
      return;
    }

    if (update.type === 'unique') {
      if (!engagementState[update.key]) {
        engagementState[update.key] = true;
        engagementUpdates[update.key] = true;
        counterIncrements[update.key] = (counterIncrements[update.key] || 0) + amount;
      }
      return;
    }

    // toggle update
    const nextValue = update.value;
    const currentValue = Boolean(engagementState[update.key]);

    if (currentValue === nextValue) {
      return;
    }

    engagementState[update.key] = nextValue;
    engagementUpdates[update.key] = nextValue;
    counterIncrements[update.key] = (counterIncrements[update.key] || 0) + (nextValue ? amount : -amount);
  });

  if (Object.keys(engagementUpdates).length > 0) {
    tx.set(userRef, buildUserEngagementUpdate(gameId, engagementUpdates), { merge: true });
  }

  if (Object.keys(counterIncrements).length > 0) {
    tx.set(gameRef, buildCounterIncrementUpdate(counterIncrements), { merge: true });
  }
};

export const applyChallengeCounterUpdates = ({
  tx,
  challengeRef,
  counterState,
  updates,
}: ApplyChallengeCounterUpdatesParams): DailyChallengeUserProgress['counters'] => {
  if (!updates.length) {
    return counterState ?? {};
  }

  const state: Record<string, boolean> = { ...(counterState ?? {}) };
  const increments: Record<string, number> = {};

  updates.forEach((update) => {
    const amount = update.type === 'toggle' ? 1 : update.amount ?? 1;

    if (update.type === 'increment') {
      increments[update.key] = (increments[update.key] || 0) + amount;
      return;
    }

    if (update.type === 'unique') {
      if (!state[update.key]) {
        state[update.key] = true;
        increments[update.key] = (increments[update.key] || 0) + amount;
      }
      return;
    }

    const nextValue = update.value;
    const currentValue = Boolean(state[update.key]);

    if (currentValue === nextValue) {
      return;
    }

    state[update.key] = nextValue;
    increments[update.key] = (increments[update.key] || 0) + (nextValue ? amount : -amount);
  });

  if (Object.keys(increments).length > 0) {
    tx.set(challengeRef, buildChallengeAnalyticsIncrementUpdate(increments), { merge: true });
  }

  return state;
};

export const GAME_COUNTER_EVENT_MAP = {
  submit_answer: [{ key: GAME_COUNTER_KEYS.UNIQUE_SUBMITTERS, type: 'unique' }],
} as const satisfies Record<string, CounterUpdate[]>;

export type GameCounterEvent = keyof typeof GAME_COUNTER_EVENT_MAP;

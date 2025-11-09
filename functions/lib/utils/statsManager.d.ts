export declare const GAME_COUNTER_KEYS: {
    readonly TOTAL_PLAYERS: "totalPlayers";
    readonly FAVORITES: "favoriteCounter";
    readonly SESSIONS_PLAYED: "sessionsPlayed";
    readonly UPDATED_AT: "updatedAt";
};
type GameCounterField = typeof GAME_COUNTER_KEYS[keyof typeof GAME_COUNTER_KEYS];
export type GameCounterKey = Exclude<GameCounterField, typeof GAME_COUNTER_KEYS.UPDATED_AT>;
type CounterIncrementMap = Partial<Record<GameCounterKey, number>>;
export declare const incrementGameCounters: ({ tx, statsRef, increments, }: {
    tx: FirebaseFirestore.Transaction;
    statsRef: FirebaseFirestore.DocumentReference;
    increments: CounterIncrementMap;
}) => void;
export declare const increaseSessionCounter: ({ tx, statsRef, amount, }: {
    tx: FirebaseFirestore.Transaction;
    statsRef: FirebaseFirestore.DocumentReference;
    amount?: number;
}) => void;
export declare const incrementTotalPlayersCounter: ({ tx, statsRef, amount, }: {
    tx: FirebaseFirestore.Transaction;
    statsRef: FirebaseFirestore.DocumentReference;
    amount?: number;
}) => void;
export declare const adjustFavoriteCounter: ({ tx, statsRef, amount, }: {
    tx: FirebaseFirestore.Transaction;
    statsRef: FirebaseFirestore.DocumentReference;
    amount: number;
}) => void;
export declare const incrementChallengeAnalyticsCounters: ({ tx, challengeRef, increments, }: {
    tx: FirebaseFirestore.Transaction;
    challengeRef: FirebaseFirestore.DocumentReference;
    increments: CounterIncrementMap;
}) => void;
export {};

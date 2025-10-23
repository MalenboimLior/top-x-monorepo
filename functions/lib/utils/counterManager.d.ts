import type { User } from '@top-x/shared/types/user';
export declare const GAME_COUNTER_KEYS: {
    readonly TOTAL_PLAYERS: "totalPlayers";
    readonly FAVORITES: "favorites";
    readonly SESSIONS_PLAYED: "sessionsPlayed";
    readonly UNIQUE_SUBMITTERS: "uniqueSubmitters";
    readonly UPDATED_AT: "updatedAt";
};
export type GameCounterKey = typeof GAME_COUNTER_KEYS[keyof typeof GAME_COUNTER_KEYS];
export type CounterUpdate = {
    key: GameCounterKey;
    type: 'increment';
    amount?: number;
} | {
    key: GameCounterKey;
    type: 'unique';
    amount?: number;
} | {
    key: GameCounterKey;
    type: 'toggle';
    value: boolean;
};
interface ApplyGameCounterUpdatesParams {
    tx: FirebaseFirestore.Transaction;
    userRef: FirebaseFirestore.DocumentReference;
    gameRef: FirebaseFirestore.DocumentReference;
    userData: User;
    gameId: string;
    updates: CounterUpdate[];
}
export declare const applyGameCounterUpdates: ({ tx, userRef, gameRef, userData, gameId, updates, }: ApplyGameCounterUpdatesParams) => void;
export declare const GAME_COUNTER_EVENT_MAP: {
    readonly submit_answer: [{
        readonly key: "uniqueSubmitters";
        readonly type: "unique";
    }];
};
export type GameCounterEvent = keyof typeof GAME_COUNTER_EVENT_MAP;
export {};

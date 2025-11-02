import type { GameStats } from '@top-x/shared/types/stats';
export declare const createEmptyGameStats: () => GameStats;
export declare const normalizeGameStats: (raw?: FirebaseFirestore.DocumentData | Partial<GameStats>) => GameStats;
export declare const hasMeaningfulCustomData: (custom?: Record<string, unknown>) => boolean;
export type PyramidTier = {
    tier: number;
    slots: (string | null)[];
};
export type PyramidWorstItem = {
    id?: string | null;
};
export type PyramidCustomData = {
    pyramid?: PyramidTier[];
    worstItem?: PyramidWorstItem;
};
export declare const isPyramidTier: (value: unknown) => value is PyramidTier;
export declare const isPyramidCustomData: (value: unknown) => value is PyramidCustomData;
export declare const hasPyramidCustomChanges: (previousCustom?: Record<string, any>, newCustom?: Record<string, any>) => boolean;
export declare const getStatsDocumentRef: (gameId: string, dailyChallengeId?: string) => FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;

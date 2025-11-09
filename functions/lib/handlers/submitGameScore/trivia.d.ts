import type { Game } from '@top-x/shared/types/game';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type { UserGameCustomData, UserGameDataSubmission } from '@top-x/shared/types/user';
export interface TriviaAttemptSubmission {
    questionId: string;
    answerHash: string;
    answeredAt?: string;
}
export interface TriviaSubmissionPayload {
    mode?: string;
    attempts: TriviaAttemptSubmission[];
    questionIds: string[];
    attemptCount: number;
    reportedAttemptCount?: number;
    bestStreak?: number;
    currentStreak?: number;
}
export interface TriviaQuestionStatsDelta {
    counts: Record<string, number>;
    total: number;
    correct: number;
}
export interface TriviaQuestionUpdate {
    ref: FirebaseFirestore.DocumentReference;
    data: FirebaseFirestore.DocumentData;
}
export interface TriviaProcessingMetrics {
    score: number;
    attemptCount: number;
    correctCount: number;
    accuracy: number;
    bestStreak?: number;
    currentStreak?: number;
    mode?: string;
    questionIds: string[];
}
export interface TriviaProcessingOutcome {
    updatedSubmission: UserGameDataSubmission;
    metrics: TriviaProcessingMetrics;
    questionUpdates: TriviaQuestionUpdate[];
    resolvedStreak: number;
}
export interface TriviaProcessingParams {
    tx: FirebaseFirestore.Transaction;
    gameRef: FirebaseFirestore.DocumentReference;
    gameSnapshot: Game | undefined;
    submittedGameData: UserGameDataSubmission;
    serverTimestamp: number;
}
export declare function isTriviaConfig(config: unknown): config is TriviaConfig;
export declare function extractTriviaSubmission(custom: UserGameCustomData | undefined): TriviaSubmissionPayload | null;
export declare function processTriviaSubmission({ tx, gameRef, gameSnapshot, submittedGameData, serverTimestamp, }: TriviaProcessingParams): Promise<TriviaProcessingOutcome | null>;

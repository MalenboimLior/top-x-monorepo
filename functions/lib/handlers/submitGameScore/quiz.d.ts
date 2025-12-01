import type { Game } from '@top-x/shared/types/game';
import type { QuizConfig } from '@top-x/shared/types/quiz';
import type { UserGameDataSubmission } from '@top-x/shared/types/user';
/**
 * Quiz submission payload from client
 */
export interface QuizSubmissionPayload {
    mode: 'personality' | 'archetype';
    /** Map of questionId to selected answer index */
    selectedAnswers: Record<string, number>;
    /** Final result for personality quiz */
    personalityResult?: {
        bucketId: string;
        title: string;
    };
    /** Final result for archetype quiz */
    archetypeResult?: {
        id: string;
        title: string;
        pattern: Record<string, 'low' | 'high'>;
    };
    /** Normalized axis scores (for radar chart display) */
    axisScores?: Record<string, number>;
    /** Total questions answered */
    questionCount: number;
    /** Timestamp when quiz was completed */
    completedAt: string;
}
export interface QuizProcessingOutcome {
    isQuizGame: true;
    mode: 'personality' | 'archetype';
    resultId?: string;
    resultTitle?: string;
}
/**
 * Check if a game config is a QuizConfig
 */
export declare function isQuizConfig(config: unknown): config is QuizConfig;
/**
 * Extract quiz submission from custom data
 */
export declare function extractQuizSubmission(custom: Record<string, unknown> | undefined): QuizSubmissionPayload | null;
/**
 * Process quiz submission.
 *
 * Quiz games don't have traditional scores or leaderboards.
 * This handler detects quiz submissions and returns early,
 * optionally logging analytics data.
 */
export declare function processQuizSubmission({ gameSnapshot, submittedGameData, }: {
    gameSnapshot: Game | undefined;
    submittedGameData: UserGameDataSubmission;
}): QuizProcessingOutcome | null;

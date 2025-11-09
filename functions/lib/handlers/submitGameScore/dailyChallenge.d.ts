import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { Game } from '@top-x/shared/types/game';
import type { GameStats } from '@top-x/shared/types/stats';
import type { DailyChallengeAttemptMetadata, DailyChallengeRewardRecord, DailyChallengeUserProgress, SubmitGameScoreRequest, UserGameData, UserGameDataSubmission } from '@top-x/shared/types/user';
import { TriviaProcessingOutcome } from './trivia';
export interface DailyChallengeProcessingParams {
    tx: FirebaseFirestore.Transaction;
    gameId: string;
    gameTypeId: string;
    userId: string;
    challengeId: string;
    challengeData: DailyChallenge;
    challengeRef: FirebaseFirestore.DocumentReference;
    challengeStatsRef: FirebaseFirestore.DocumentReference | null;
    challengeStatsDoc: FirebaseFirestore.DocumentSnapshot | null;
    rewardRef: FirebaseFirestore.DocumentReference | null;
    existingRewardDoc: FirebaseFirestore.DocumentSnapshot | null;
    resolvedDailyChallengeDate: string;
    payloadChallengeMetadata?: SubmitGameScoreRequest['challengeMetadata'];
    previousGameData: UserGameData | undefined;
    enrichedSubmission: UserGameDataSubmission;
    originalSubmission: UserGameDataSubmission;
    streakToPersist: number;
    serverTimestamp: number;
    triviaOutcome: TriviaProcessingOutcome | null;
    attemptMetadata: DailyChallengeAttemptMetadata | undefined;
    gameSnapshot: Game | undefined;
}
export interface DailyChallengeProcessingOutcome {
    challengeBestScore?: number;
    challengeGameDataUpdate?: UserGameData;
    challengeProgressUpdate?: DailyChallengeUserProgress;
    challengeAttemptCount?: number;
    challengePlayedAtIso?: string;
    challengeSolvedAtIso?: string;
    challengeAttemptMetadata?: DailyChallengeAttemptMetadata;
    challengeStatsUpdate?: (Partial<GameStats> & {
        totalAttempts?: number;
        correctAttempts?: number;
    });
    pendingRewardRecord?: DailyChallengeRewardRecord;
}
export declare function processDailyChallengeSubmission({ tx, gameId, gameTypeId, userId, challengeId, challengeData, challengeRef, challengeStatsRef, challengeStatsDoc, rewardRef, existingRewardDoc, resolvedDailyChallengeDate, payloadChallengeMetadata, previousGameData, enrichedSubmission, originalSubmission, streakToPersist, serverTimestamp, triviaOutcome, attemptMetadata, gameSnapshot, }: DailyChallengeProcessingParams): DailyChallengeProcessingOutcome;

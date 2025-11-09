import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { Game } from '@top-x/shared/types/game';
import type { UserGameDataSubmission, DailyChallengeAttemptMetadata } from '@top-x/shared/types/user';
export interface ZoneRevealProcessingParams {
    gameTypeId: string;
    submittedGameData: UserGameDataSubmission;
    gameSnapshot: Game | undefined;
    challengeData: DailyChallenge | null;
}
export interface ZoneRevealProcessingOutcome {
    updatedSubmission: UserGameDataSubmission;
    attemptMetadata?: DailyChallengeAttemptMetadata;
}
export declare function processZoneRevealSubmission({ gameTypeId, submittedGameData, gameSnapshot, challengeData, }: ZoneRevealProcessingParams): ZoneRevealProcessingOutcome;

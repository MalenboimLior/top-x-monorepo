import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { Game } from '@top-x/shared/types/game';
import type { UserGameDataSubmission, DailyChallengeAttemptMetadata } from '@top-x/shared/types/user';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import { evaluateZoneRevealAnswer } from '@top-x/shared/utils/zoneRevealAnswer';

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

const ZONE_REVEAL_GAME_TYPE = 'ZoneReveal';

export function processZoneRevealSubmission({
  gameTypeId,
  submittedGameData,
  gameSnapshot,
  challengeData,
}: ZoneRevealProcessingParams): ZoneRevealProcessingOutcome {
  if (gameTypeId !== ZONE_REVEAL_GAME_TYPE) {
    return { updatedSubmission: submittedGameData };
  }

  const zoneRevealConfig = (challengeData?.custom as ZoneRevealConfig | undefined)
    ?? (gameSnapshot?.custom as ZoneRevealConfig | undefined);

  const rawAnswer = submittedGameData.custom?.answer;
  let attempt: string | undefined;

  if (typeof rawAnswer === 'string') {
    attempt = rawAnswer;
  } else if (rawAnswer && typeof rawAnswer === 'object') {
    const record = rawAnswer as Record<string, unknown>;
    const candidate = record.original ?? record.value ?? record.attempt;
    if (typeof candidate === 'string') {
      attempt = candidate;
    }
  }

  if (!zoneRevealConfig?.answer || typeof attempt !== 'string') {
    return { updatedSubmission: submittedGameData };
  }

  const { normalizedAnswer, distance, isMatch } = evaluateZoneRevealAnswer(
    zoneRevealConfig.answer,
    attempt,
  );

  const custom = {
    ...(submittedGameData.custom ?? {}),
    normalized: normalizedAnswer,
    distance,
    isMatch,
  };

  return {
    updatedSubmission: {
      ...submittedGameData,
      custom,
    },
    attemptMetadata: {
      normalizedAnswer,
      distance,
      isMatch,
    },
  };
}


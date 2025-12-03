import type { UserGameCustomData } from '@top-x/shared/types/user';
import type {
  TriviaLeaderboardCustom,
  QuizLeaderboardCustom,
  PyramidLeaderboardCustom,
  ZoneRevealLeaderboardCustom,
  PacmanLeaderboardCustom,
  FisherGameLeaderboardCustom,
} from '@top-x/shared/types/leaderboardCustom';
import type {
  TriviaUserCustom,
  QuizUserCustom,
  PyramidUserCustom,
  ZoneRevealUserCustom,
  PacmanUserCustom,
  FisherGameUserCustom,
} from '@top-x/shared/types/userGameCustom';

/**
 * Separates trivia custom data into leaderboard and user-specific data
 */
export function separateTriviaData(
  custom: UserGameCustomData,
  metrics: {
    questionIds: string[];
    answerHashes: string[];
    mode: 'fixed' | 'endless';
    attemptCount: number;
    correctCount: number;
    accuracy: number;
    score: number;
    streak: number;
  }
): { leaderboard: TriviaLeaderboardCustom; user: TriviaUserCustom } {
  const lastPlayed = Date.now();

  // Leaderboard: Full analytics data
  const leaderboard: TriviaLeaderboardCustom = {
    trivia: {
      questionIds: metrics.questionIds,
      answerHashes: metrics.answerHashes,
      mode: metrics.mode,
      attemptCount: metrics.attemptCount,
      correctCount: metrics.correctCount,
      accuracy: metrics.accuracy,
      score: metrics.score,
      streak: metrics.streak,
      lastQuestionIds: metrics.questionIds,
      lastAccuracy: metrics.accuracy,
    },
  };

  // User: Minimal data for profile
  const user: TriviaUserCustom = {
    trivia: {
      score: metrics.score,
      streak: metrics.streak,
      lastPlayed,
    },
  };

  return { leaderboard, user };
}

/**
 * Separates quiz custom data into leaderboard and user-specific data
 */
export function separateQuizData(
  custom: UserGameCustomData,
  quizSubmission?: {
    questionIds: string[];
    selectedAnswers: Record<string, number>;
    result: { id: string; title: string };
    mode: 'personality' | 'archetype';
    image?: string;
  }
): { leaderboard: QuizLeaderboardCustom; user: QuizUserCustom } {
  const quizData = custom.quiz as Record<string, unknown> | undefined;

  // Extract result from quiz data
  const personalityResult = quizData?.personalityResult as { bucketId: string; title: string } | undefined;
  const archetypeResult = quizData?.archetypeResult as { id: string; title: string } | undefined;
  const mode = (quizData?.mode ?? quizSubmission?.mode) as 'personality' | 'archetype' | undefined;

  const result = quizSubmission?.result ?? (personalityResult
    ? { id: personalityResult.bucketId, title: personalityResult.title }
    : archetypeResult
      ? { id: archetypeResult.id, title: archetypeResult.title }
      : undefined);

  if (!result || !mode) {
    throw new Error('Quiz data missing result or mode');
  }

  // Extract question IDs from selectedAnswers keys if not provided
  const questionIds = quizSubmission?.questionIds ?? Object.keys(quizSubmission?.selectedAnswers ?? (quizData?.selectedAnswers as Record<string, number>) ?? {});

  // Leaderboard: Full analytics data
  const leaderboard: QuizLeaderboardCustom = {
    quiz: {
      questionIds,
      selectedAnswers: quizSubmission?.selectedAnswers ?? (quizData?.selectedAnswers as Record<string, number>) ?? {},
      result: {
        id: result.id,
        title: result.title,
      },
      mode,
    },
  };

  // User: Minimal result data for profile
  const user: QuizUserCustom = {
    quiz: {
      result: {
        id: result.id,
        title: result.title,
        image: quizSubmission?.image ?? (quizData?.resultImage as string) ?? undefined,
      },
      mode,
    },
  };

  return { leaderboard, user };
}

/**
 * Separates pyramid custom data into leaderboard and user-specific data
 */
export function separatePyramidData(
  custom: UserGameCustomData,
  score?: number
): { leaderboard: PyramidLeaderboardCustom; user: PyramidUserCustom } {
  const pyramidData = custom.pyramid as Array<{ tier: number; slots: string[] }> | undefined;
  const worstItem = custom.worstItem as { id: string } | undefined;

  if (!pyramidData || !worstItem) {
    throw new Error('Pyramid data missing pyramid or worstItem');
  }

  // Leaderboard: Structure for analytics (item IDs only)
  const leaderboard: PyramidLeaderboardCustom = {
    pyramid: pyramidData.map((tier) => ({
      tier: tier.tier,
      slots: tier.slots, // Item IDs
    })),
    worstItem: {
      id: worstItem.id,
    },
  };

  // User: Same structure (needed to restore) + rank/percentile
  const user: PyramidUserCustom = {
    pyramid: pyramidData.map((tier) => ({
      tier: tier.tier,
      slots: tier.slots, // Item IDs
    })),
    worstItem: {
      id: worstItem.id,
    },
    score: score ?? 0,
  };

  return { leaderboard, user };
}

/**
 * Separates zoneReveal custom data into leaderboard and user-specific data
 */
export function separateZoneRevealData(
  custom: UserGameCustomData,
  score?: number,
  streak?: number,
  attemptCount?: number
): { leaderboard: ZoneRevealLeaderboardCustom; user: ZoneRevealUserCustom } {
  const normalizedAnswer = custom.normalized as string | undefined;
  const distance = custom.distance as number | undefined;
  const isMatch = custom.isMatch as boolean | undefined;

  if (normalizedAnswer === undefined || isMatch === undefined) {
    throw new Error('ZoneReveal data missing normalized answer or isMatch');
  }

  // Leaderboard: Answer data for analytics
  const leaderboard: ZoneRevealLeaderboardCustom = {
    zoneReveal: {
      answer: normalizedAnswer,
      distance,
      isMatch,
      attemptCount: attemptCount ?? 1,
    },
  };

  // User: Minimal score/rank data
  const user: ZoneRevealUserCustom = {
    zoneReveal: {
      answer: normalizedAnswer,
      score: score ?? 0,
      streak: streak ?? 0,
    },
  };

  return { leaderboard, user };
}

/**
 * Separates pacman custom data into leaderboard and user-specific data
 */
export function separatePacmanData(
  custom: UserGameCustomData,
  score?: number
): { leaderboard: PacmanLeaderboardCustom; user: PacmanUserCustom } {
  const pacmanData = custom.pacman as Record<string, unknown> | undefined;

  const level = (pacmanData?.level ?? custom.level) as number | undefined;
  const livesRemaining = pacmanData?.livesRemaining as number | undefined;
  const timeElapsed = pacmanData?.timeElapsed as number | undefined;

  // Leaderboard: Complete session data
  const leaderboard: PacmanLeaderboardCustom = {
    pacman: {
      level: level ?? 1,
      score: score ?? (pacmanData?.score as number) ?? 0,
      livesRemaining: livesRemaining ?? 0,
      timeElapsed: timeElapsed ?? 0,
    },
  };

  // User: Best achievements + rank
  const user: PacmanUserCustom = {
    pacman: {
      score: score ?? (pacmanData?.score as number) ?? 0,
      level: level ?? 1,
    },
  };

  return { leaderboard, user };
}

/**
 * Separates fisherGame custom data into leaderboard and user-specific data
 */
export function separateFisherGameData(
  custom: UserGameCustomData,
  score?: number
): { leaderboard: FisherGameLeaderboardCustom; user: FisherGameUserCustom } {
  const fisherData = custom.fisherGame as Record<string, unknown> | undefined;

  const fishCaught = fisherData?.fishCaught as number | undefined;
  const timeElapsed = fisherData?.timeElapsed as number | undefined;

  // Leaderboard: Complete session data
  const leaderboard: FisherGameLeaderboardCustom = {
    fisherGame: {
      score: score ?? (fisherData?.score as number) ?? 0,
      fishCaught: fishCaught ?? 0,
      timeElapsed: timeElapsed ?? 0,
    },
  };

  // User: Best achievements + rank
  const user: FisherGameUserCustom = {
    fisherGame: {
      score: score ?? (fisherData?.score as number) ?? 0,
      fishCaught: fishCaught ?? 0,
    },
  };

  return { leaderboard, user };
}


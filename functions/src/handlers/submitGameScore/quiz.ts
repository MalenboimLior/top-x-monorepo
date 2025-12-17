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
export function isQuizConfig(config: unknown): config is QuizConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const c = config as Record<string, unknown>;
  const mode = c.mode;

  // Check if mode is explicitly set to quiz modes
  if (mode === 'personality' || mode === 'archetype') {
    return true;
  }

  // Also check for quiz-specific fields (personalityBuckets or archetypeAxes)
  // This handles cases where the mode might be incorrectly set
  const hasPersonalityBuckets = Array.isArray(c.personalityBuckets) && c.personalityBuckets.length > 0;
  const hasArchetypeAxes = Array.isArray(c.archetypeAxes) && c.archetypeAxes.length > 0;

  return hasPersonalityBuckets || hasArchetypeAxes;
}

/**
 * Extract quiz submission from custom data
 */
export function extractQuizSubmission(
  custom: Record<string, unknown> | undefined
): QuizSubmissionPayload | null {
  if (!custom) {
    return null;
  }

  // Look for quiz data in various locations
  const quizData = custom.quiz as Record<string, unknown> | undefined;
  if (!quizData) {
    return null;
  }

  const mode = quizData.mode as string | undefined;
  if (mode !== 'personality' && mode !== 'archetype') {
    return null;
  }

  return {
    mode: mode as 'personality' | 'archetype',
    selectedAnswers: (quizData.selectedAnswers as Record<string, number>) ?? {},
    personalityResult: quizData.personalityResult as QuizSubmissionPayload['personalityResult'],
    archetypeResult: quizData.archetypeResult as QuizSubmissionPayload['archetypeResult'],
    axisScores: quizData.axisScores as Record<string, number>,
    questionCount: (quizData.questionCount as number) ?? 0,
    completedAt: (quizData.completedAt as string) ?? new Date().toISOString(),
  };
}

/**
 * Process quiz submission.
 * 
 * Quiz games don't have traditional scores or leaderboards.
 * This handler detects quiz submissions and returns early,
 * optionally logging analytics data.
 */
export function processQuizSubmission({
  gameSnapshot,
  submittedGameData,
}: {
  gameSnapshot: Game | undefined;
  submittedGameData: UserGameDataSubmission;
}): QuizProcessingOutcome | null {
  console.log('[processQuizSubmission] ===== ENTRY =====');
  console.log('[processQuizSubmission] Has gameSnapshot:', !!gameSnapshot);
  console.log('[processQuizSubmission] gameSnapshot.gameTypeId:', gameSnapshot?.gameTypeId);
  console.log('[processQuizSubmission] gameSnapshot.custom:', gameSnapshot?.custom);
  console.log('[processQuizSubmission] Is quiz config:', gameSnapshot ? isQuizConfig(gameSnapshot.custom) : false);

  // Check if this is a quiz game
  if (!gameSnapshot || !isQuizConfig(gameSnapshot.custom)) {
    console.log('[processQuizSubmission] NOT a quiz game - returning null');
    console.log('[processQuizSubmission] Reason:', !gameSnapshot ? 'No gameSnapshot' : 'Not a quiz config');
    return null;
  }

  console.log('[processQuizSubmission] Confirmed: This IS a quiz game');
  const quizConfig = gameSnapshot.custom as QuizConfig;
  console.log('[processQuizSubmission] Quiz config mode:', quizConfig.mode);
  console.log('[processQuizSubmission] submittedGameData.custom:', submittedGameData.custom);

  const quizSubmission = extractQuizSubmission(
    submittedGameData.custom as Record<string, unknown> | undefined
  );

  if (!quizSubmission) {
    // This is a quiz game but no quiz data was submitted
    // Could be initial load or other non-submission request
    console.log('[processQuizSubmission] Quiz game but NO quiz submission data - returning null');
    return null;
  }

  console.log('[processQuizSubmission] Quiz submission found:', {
    mode: quizSubmission.mode,
    hasPersonalityResult: !!quizSubmission.personalityResult,
    hasArchetypeResult: !!quizSubmission.archetypeResult,
    selectedAnswersCount: Object.keys(quizSubmission.selectedAnswers).length,
  });

  console.log('submitGameScore: processing quiz submission', {
    mode: quizConfig.mode,
    questionCount: quizSubmission.questionCount,
    hasResult: quizSubmission.mode === 'personality'
      ? Boolean(quizSubmission.personalityResult)
      : Boolean(quizSubmission.archetypeResult),
  });

  // Return outcome indicating this is a quiz game
  const outcome: QuizProcessingOutcome = {
    isQuizGame: true,
    mode: quizConfig.mode,
  };

  if (quizSubmission.mode === 'personality' && quizSubmission.personalityResult) {
    outcome.resultId = quizSubmission.personalityResult.bucketId;
    outcome.resultTitle = quizSubmission.personalityResult.title;
  } else if (quizSubmission.mode === 'archetype' && quizSubmission.archetypeResult) {
    outcome.resultId = quizSubmission.archetypeResult.id;
    outcome.resultTitle = quizSubmission.archetypeResult.title;
  }

  console.log('[processQuizSubmission] Returning outcome:', outcome);
  console.log('[processQuizSubmission] ===== EXIT =====');
  return outcome;
}


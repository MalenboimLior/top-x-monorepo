// packages/shared/src/quiz/scoring.ts

import type {
  QuizQuestion,
  QuizAnswer,
  PersonalityBucket,
  PersonalityResultVariant,
  ArchetypeAxis,
  ArchetypeResult,
} from '../types/quiz';

// =============================================================================
// Personality Quiz Scoring
// =============================================================================

export interface PersonalityScoreResult {
  /** Scores accumulated per bucket */
  bucketScores: Record<string, number>;
  /** The winning bucket (highest score) */
  winningBucket: PersonalityBucket | null;
  /** The matching result variant for the winning bucket and score */
  result: PersonalityResultVariant | null;
  /** All bucket scores sorted by value (descending) */
  sortedBuckets: Array<{ id: string; label: string; score: number }>;
  /** Map of questionId to selected answer index (for analytics) */
  selectedAnswers: Record<string, number>;
  /** Bucket ID of the winning bucket (for easy access) */
  bucketId: string;
  /** Title of the result (for easy access) */
  title: string;
  /** Points accumulated in the winning bucket (for easy access) */
  points: number;
}

/**
 * Find the best matching result variant for a given score.
 * Matches by score range, or returns the first result as default.
 */
function findResultVariant(
  results: PersonalityResultVariant[],
  score: number
): PersonalityResultVariant | null {
  if (!results || results.length === 0) {
    return null;
  }

  // Try to find a result matching the score range
  const rangedMatch = results.find((r) => {
    const minOk = r.minScore === undefined || score >= r.minScore;
    const maxOk = r.maxScore === undefined || score <= r.maxScore;
    return minOk && maxOk;
  });

  if (rangedMatch) {
    return rangedMatch;
  }

  // Fall back to first result (default)
  return results[0];
}

/**
 * Calculate personality quiz result based on accumulated bucket points.
 * 
 * @param selectedAnswers - Map of questionId to selected answer index
 * @param questions - All quiz questions
 * @param buckets - Available personality buckets (with embedded results)
 * @returns Calculated scores and matching result
 */
export function calculatePersonalityResult(
  selectedAnswers: Record<string, number>,
  questions: QuizQuestion[],
  buckets: PersonalityBucket[]
): PersonalityScoreResult {
  // Initialize bucket scores to 0
  const bucketScores: Record<string, number> = {};
  buckets.forEach((bucket) => {
    bucketScores[bucket.id] = 0;
  });

  // Accumulate points from each selected answer
  questions.forEach((question) => {
    const selectedIndex = selectedAnswers[question.id];
    if (selectedIndex === undefined || selectedIndex < 0) {
      return;
    }

    const answer = question.answers[selectedIndex];
    if (!answer?.bucketPoints) {
      return;
    }

    // Add points to each bucket from this answer
    Object.entries(answer.bucketPoints).forEach(([bucketId, points]) => {
      if (bucketId in bucketScores) {
        bucketScores[bucketId] += points;
      }
    });
  });

  // Find the winning bucket (highest score)
  let winningBucket: PersonalityBucket | null = null;
  let highestScore = -Infinity;

  for (const bucket of buckets) {
    const score = bucketScores[bucket.id] ?? 0;
    if (score > highestScore) {
      highestScore = score;
      winningBucket = bucket;
    }
  }

  // Find the matching result variant for the winning bucket's score
  let result: PersonalityResultVariant | null = null;
  if (winningBucket) {
    result = findResultVariant(winningBucket.results, highestScore);
  }

  // Create sorted bucket list for display
  const sortedBuckets = buckets
    .map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      score: bucketScores[bucket.id] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    bucketScores,
    winningBucket,
    result,
    sortedBuckets,
    selectedAnswers,
    bucketId: winningBucket?.id ?? '',
    title: result?.title ?? '',
    points: highestScore,
  };
}

// =============================================================================
// Archetype Quiz Scoring
// =============================================================================

export interface ArchetypeScoreResult {
  /** Raw scores per axis (can be positive or negative) */
  axisScores: Record<string, number>;
  /** Normalized scores (0-100 scale for radar chart) */
  normalizedScores: Record<string, number>;
  /** Pattern derived from axis scores */
  pattern: Record<string, 'low' | 'high'>;
  /** The matching result for the pattern */
  result: ArchetypeResult | null;
  /** Human-readable axis labels with values */
  axisLabels: Array<{
    id: string;
    lowLabel: string;
    highLabel: string;
    score: number;
    normalizedScore: number;
    direction: 'low' | 'high';
  }>;
  /** Map of questionId to selected answer index (for analytics) */
  selectedAnswers: Record<string, number>;
  /** ID of the matching result (for easy access) */
  id: string;
  /** Title of the result (for easy access) */
  title: string;
}

/**
 * Calculate archetype quiz result based on accumulated axis points.
 * 
 * @param selectedAnswers - Map of questionId to selected answer index
 * @param questions - All quiz questions
 * @param axes - Available archetype axes
 * @param results - Available archetype results
 * @returns Calculated scores, pattern, and matching result
 */
export function calculateArchetypeResult(
  selectedAnswers: Record<string, number>,
  questions: QuizQuestion[],
  axes: ArchetypeAxis[],
  results: ArchetypeResult[]
): ArchetypeScoreResult {
  // Initialize axis scores to 0
  const axisScores: Record<string, number> = {};
  axes.forEach((axis) => {
    axisScores[axis.id] = 0;
  });

  // Track min/max for each axis (for normalization)
  const axisRanges: Record<string, { min: number; max: number }> = {};
  axes.forEach((axis) => {
    axisRanges[axis.id] = { min: 0, max: 0 };
  });

  // Calculate theoretical min/max by summing all possible answer points
  questions.forEach((question) => {
    question.answers.forEach((answer) => {
      if (!answer.axisPoints) return;

      Object.entries(answer.axisPoints).forEach(([axisId, points]) => {
        if (!(axisId in axisRanges)) return;

        if (points > 0) {
          axisRanges[axisId].max += points;
        } else {
          axisRanges[axisId].min += points;
        }
      });
    });
  });

  // Accumulate points from each selected answer
  questions.forEach((question) => {
    const selectedIndex = selectedAnswers[question.id];
    if (selectedIndex === undefined || selectedIndex < 0) {
      return;
    }

    const answer = question.answers[selectedIndex];
    if (!answer?.axisPoints) {
      return;
    }

    // Add points to each axis from this answer
    Object.entries(answer.axisPoints).forEach(([axisId, points]) => {
      if (axisId in axisScores) {
        axisScores[axisId] += points;
      }
    });
  });

  // Determine pattern (high/low) for each axis
  const pattern: Record<string, 'low' | 'high'> = {};
  axes.forEach((axis) => {
    pattern[axis.id] = axisScores[axis.id] >= 0 ? 'high' : 'low';
  });

  // Normalize scores to 0-100 scale for radar chart
  const normalizedScores: Record<string, number> = {};
  axes.forEach((axis) => {
    const score = axisScores[axis.id];
    const range = axisRanges[axis.id];
    const totalRange = range.max - range.min;

    if (totalRange === 0) {
      normalizedScores[axis.id] = 50; // Neutral if no range
    } else {
      // Normalize to 0-100 where 50 is neutral
      normalizedScores[axis.id] = Math.round(
        ((score - range.min) / totalRange) * 100
      );
    }
  });

  // Find matching result based on pattern
  const result = findMatchingArchetypeResult(pattern, results);

  // Create axis labels with values for display
  const axisLabels = axes.map((axis) => ({
    id: axis.id,
    lowLabel: axis.lowLabel,
    highLabel: axis.highLabel,
    score: axisScores[axis.id],
    normalizedScore: normalizedScores[axis.id],
    direction: pattern[axis.id],
  }));

  return {
    axisScores,
    normalizedScores,
    pattern,
    result,
    axisLabels,
    selectedAnswers,
    id: result?.id ?? '',
    title: result?.title ?? '',
  };
}

/**
 * Find the archetype result that best matches the given pattern.
 * Uses exact matching first, then falls back to closest match.
 */
function findMatchingArchetypeResult(
  pattern: Record<string, 'low' | 'high'>,
  results: ArchetypeResult[]
): ArchetypeResult | null {
  if (results.length === 0) {
    return null;
  }

  // Try exact match first
  const exactMatch = results.find((result) => {
    return Object.entries(result.pattern).every(
      ([axisId, value]) => pattern[axisId] === value
    );
  });

  if (exactMatch) {
    return exactMatch;
  }

  // Fall back to closest match (most matching axes)
  let bestMatch: ArchetypeResult | null = null;
  let bestScore = -1;

  results.forEach((result) => {
    let matchScore = 0;
    Object.entries(result.pattern).forEach(([axisId, value]) => {
      if (pattern[axisId] === value) {
        matchScore++;
      }
    });

    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestMatch = result;
    }
  });

  return bestMatch;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * Returns a new shuffled array without modifying the original.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle questions and optionally their answers.
 */
export function shuffleQuizQuestions(
  questions: QuizQuestion[],
  shuffleAnswers: boolean = false
): QuizQuestion[] {
  const shuffledQuestions = shuffleArray(questions);

  if (!shuffleAnswers) {
    return shuffledQuestions;
  }

  return shuffledQuestions.map((question) => ({
    ...question,
    answers: shuffleArray(question.answers),
  }));
}

/**
 * Check if a quiz config is valid for the given mode.
 */
export function isValidQuizConfig(
  config: { mode: string; questions?: QuizQuestion[] } | null | undefined,
  expectedMode?: 'personality' | 'archetype'
): boolean {
  if (!config) return false;
  if (!Array.isArray(config.questions) || config.questions.length === 0) return false;
  if (expectedMode && config.mode !== expectedMode) return false;
  return true;
}


export interface TriviaSpeedBonusTier {
  minRatio: number;
  bonus: number;
}

export const TRIVIA_PER_QUESTION_BASE_POINTS = 100;
export const TRIVIA_STREAK_BONUS_STEP = 10;
export const TRIVIA_SPEED_BONUS_TIERS: TriviaSpeedBonusTier[] = [
  { minRatio: 0.75, bonus: 30 },
  { minRatio: 0.5, bonus: 20 },
  { minRatio: 0.25, bonus: 10 },
];

export function calculateTriviaSpeedBonus(
  timeRemainingSeconds: number | null | undefined,
  durationSeconds: number | null | undefined,
): number {
  if (
    typeof timeRemainingSeconds !== 'number'
    || typeof durationSeconds !== 'number'
    || durationSeconds <= 0
    || timeRemainingSeconds <= 0
  ) {
    return 0;
  }

  const ratio = Math.min(Math.max(timeRemainingSeconds / durationSeconds, 0), 1);
  const tier = TRIVIA_SPEED_BONUS_TIERS.find(({ minRatio }) => ratio >= minRatio);
  return tier ? tier.bonus : 0;
}

export interface TriviaQuestionScoreInput {
  isCorrect: boolean;
  durationSeconds?: number | null;
  timeRemainingSeconds?: number | null;
}

export interface TriviaScoreBreakdown {
  totalScore: number;
  totalBasePoints: number;
  totalStreakBonus: number;
  totalSpeedBonus: number;
  bestStreak: number;
  currentStreak: number;
}

export function accumulateTriviaScore(inputs: TriviaQuestionScoreInput[]): TriviaScoreBreakdown {
  let totalScore = 0;
  let totalBasePoints = 0;
  let totalStreakBonus = 0;
  let totalSpeedBonus = 0;
  let currentStreak = 0;
  let bestStreak = 0;

  inputs.forEach((input) => {
    if (!input.isCorrect) {
      currentStreak = 0;
      return;
    }

    currentStreak += 1;
    bestStreak = Math.max(bestStreak, currentStreak);

    const basePoints = TRIVIA_PER_QUESTION_BASE_POINTS;
    const streakBonus = Math.max(0, currentStreak - 1) * TRIVIA_STREAK_BONUS_STEP;
    const speedBonus = calculateTriviaSpeedBonus(input.timeRemainingSeconds, input.durationSeconds);

    totalBasePoints += basePoints;
    totalStreakBonus += streakBonus;
    totalSpeedBonus += speedBonus;
    totalScore += basePoints + streakBonus + speedBonus;
  });

  return {
    totalScore,
    totalBasePoints,
    totalStreakBonus,
    totalSpeedBonus,
    bestStreak,
    currentStreak,
  };
}


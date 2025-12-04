// User game custom data types - minimal data for profile display

export interface TriviaUserCustom {
  trivia: {
    score: number; // Best score
    streak: number; // Best streak
    leaderboardRank?: number; // Current position (computed on submission)
    leaderboardTotalUsers?: number; // Total users in leaderboard
    percentile?: number; // Percentile rank (e.g., 45 = top 45%)
    lastPlayed: number; // Timestamp
  };
}

export interface QuizUserCustom {
  quiz: {
    result: {
      id: string; // bucketId or id
      title: string; // "You are a Lion"
      image?: string; // Result image URL (for profile display)
    };
    mode: 'personality' | 'archetype';
  };
}

export interface PyramidUserCustom {
  pyramid: Array<{
    tier: number;
    slots: string[]; // Item IDs (needed to restore pyramid)
  }>;
  worstItem: {
    id: string; // Item ID (needed to restore)
  };
  score: number; // Calculated score
  leaderboardRank?: number; // Current position
  leaderboardTotalUsers?: number; // Total users in leaderboard
  percentile?: number; // Percentile rank
}

export interface ZoneRevealUserCustom {
  zoneReveal: {
    answer: string; // Normalized answer
    score: number; // Best score
    streak: number; // Best streak
    leaderboardRank?: number; // Current position
    leaderboardTotalUsers?: number; // Total users in leaderboard
    percentile?: number; // Percentile rank
  };
}

export interface PacmanUserCustom {
  pacman: {
    score: number; // Best score
    level: number; // Best level reached
    leaderboardRank?: number; // Current position
    leaderboardTotalUsers?: number; // Total users in leaderboard
    percentile?: number; // Percentile rank
  };
}

export interface FisherGameUserCustom {
  fisherGame: {
    score: number; // Best score
    fishCaught: number; // Best fish caught count
    leaderboardRank?: number; // Current position
    leaderboardTotalUsers?: number; // Total users in leaderboard
    percentile?: number; // Percentile rank
  };
}

// Union type for all user custom data
export type UserGameCustomDataUnion =
  | TriviaUserCustom
  | QuizUserCustom
  | PyramidUserCustom
  | ZoneRevealUserCustom
  | PacmanUserCustom
  | FisherGameUserCustom
  | Record<string, unknown>; // Fallback for unknown types


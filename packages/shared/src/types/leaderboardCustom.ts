// Leaderboard custom data types - full analytics data for game creators

export interface TriviaLeaderboardCustom {
  trivia: {
    answers: Record<string, string>; // Maps questionId -> answerHash for analytics
    mode: 'classic' | 'speed'; // Matches TriviaConfig.mode
    accuracy: number; // Percentage
    score: number; // Final score
    streak: number; // Best streak
  };
}

export interface QuizLeaderboardCustom {
  quiz: {
    selectedAnswers: Record<string, number>; // questionId -> answerIndex
    result: {
      id: string; // bucketId (personality) or id (archetype)
      title: string; // "You are a Lion"
    };
    mode: 'personality' | 'archetype';
  };
}

export interface PyramidLeaderboardCustom {
  pyramid: Array<{
    tier: number;
    slots: string[]; // Item IDs only
  }>;
  worstItem: {
    id: string; // Item ID only
  };
}

export interface ZoneRevealLeaderboardCustom {
  zoneReveal: {
    answer: string; // Normalized answer
    distance?: number; // Distance from correct answer
    isMatch: boolean; // Whether answer was correct
    attemptCount: number;
  };
}

export interface PacmanLeaderboardCustom {
  pacman: {
    level: number; // Highest level reached
    score: number; // Final score
    livesRemaining: number;
    timeElapsed: number; // Time played in seconds
  };
}

export interface FisherGameLeaderboardCustom {
  fisherGame: {
    score: number; // Final score
    fishCaught: number; // Number of fish caught
    timeElapsed: number; // Time played in seconds
  };
}

// Union type for all leaderboard custom data
export type LeaderboardCustomData =
  | TriviaLeaderboardCustom
  | QuizLeaderboardCustom
  | PyramidLeaderboardCustom
  | ZoneRevealLeaderboardCustom
  | PacmanLeaderboardCustom
  | FisherGameLeaderboardCustom
  | Record<string, unknown>; // Fallback for unknown types


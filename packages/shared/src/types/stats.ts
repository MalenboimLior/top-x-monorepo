export interface ScoreDistribution {
  [score: number]: number;
}

export interface GameStats {
  totalPlayers: number;
  sessionsPlayed: number;
  favoriteCounter: number;
  scoreDistribution: ScoreDistribution;
  updatedAt: number;
  custom?: Record<string, any>;
  totalAttempts?: number;
  correctAttempts?: number;
  averageSolveTimeSec?: number;
}

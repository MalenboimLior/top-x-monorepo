export interface ScoreDistribution {
  [score: number]: number;
}

export interface GameStats {
  totalPlayers: number;
  sessionsPlayed: number;
  uniqueSubmitters: number;
  favorites: number;
  scoreDistribution: ScoreDistribution;
  updatedAt: number;
  custom?: Record<string, any>;
  totalAttempts?: number;
  correctAttempts?: number;
  averageSolveTimeSec?: number;
}

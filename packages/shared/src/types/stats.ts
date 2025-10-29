export interface ScoreDistribution {
  [score: number]: number;
}

export interface GameStats {
  totalPlayers: number;
  scoreDistribution: ScoreDistribution;
  updatedAt: number;
  custom?: Record<string, any>;
}

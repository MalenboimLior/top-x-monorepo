export interface PacmanEnemyEntry {
  id: string;
  name: string;
  behavior: 'chaser' | 'ambusher' | 'patroller' | 'random';
  color?: string;
  scatterTargetTile?: { x: number; y: number };
  speedMultiplier?: number;
  frightenedSpeedMultiplier?: number;
  entryDelayMs?: number;
}

export interface PacmanPowerUpEntry {
  id: string;
  type: 'energizer' | 'fruit' | 'speedBoost' | 'shield';
  durationMs?: number;
  spawnAtSeconds?: number;
  pointsAwarded?: number;
  maxActive?: number;
}

export interface PacmanLevelMetadata {
  id: string;
  name: string;
  layoutId: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  description?: string;
  designer?: string;
  releaseDate?: string;
}

export interface PacmanScoringKnobs {
  dotValue: number;
  energizerValue: number;
  ghostComboBase: number;
  ghostComboIncrement: number;
  fruitValues: number[];
  frightenedDurationMs: number;
}

export interface PacmanLevelConfig {
  metadata: PacmanLevelMetadata;
  dotCount: number;
  energizerCount: number;
  enemyOverrides?: PacmanEnemyEntry[];
  powerUps?: PacmanPowerUpEntry[];
  scatterChaseIntervals?: { scatterMs: number; chaseMs: number }[];
  frightenedModeDurationMs?: number;
  ghostRegenerationMs?: number;
}

export interface PacmanConfig {
  version: number;
  startingLives: number;
  bonusLifeThresholds: number[];
  allowWraparound: boolean;
  defaultScoring: PacmanScoringKnobs;
  enemies: PacmanEnemyEntry[];
  powerUps: PacmanPowerUpEntry[];
  levels: PacmanLevelConfig[];
  speedSettings?: {
    pacmanSpeed: number;
    ghostSpeed: number;
    frightenedSpeed: number;
  };
  theme?: 'classic' | 'neon' | 'retro';
}

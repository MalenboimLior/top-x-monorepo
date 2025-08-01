export interface EnemyConfig {
  type: string;
  count: number;
}

export interface PowerupConfig {
  type: string;
  count: number;
}

export interface LevelConfig {
  enemyConfig: EnemyConfig[];
  powerupConfig: PowerupConfig[];
  timeLimit: number;
  hiddenImage: string;
  levelHeader: string;
}

export interface ZoneRevealConfig {
  levelsConfig: LevelConfig[];
  backgroundImage: string;
  spritesheets?: Record<string, string>;
  playerSpeed?: number;
  enemiesSpeedArray?: Record<string, number>;
  finishPercent?: number;
  heartIcon?: string;
}

// interface EnemyType {
//   type: 'core' | 'chaser' | 'zigzag' | 'bouncer' | 'projectile' | 'bomb';
//   asset: string;
//   speed: number;
//   behavior: 'roam' | 'borderChase' | 'zigzag' | 'bounce' | 'shoot' | 'explode';
// }

// interface PowerUp {
//   type: 'speed' | 'shield' | 'freeze' | 'bomb';
//   asset: string;
// }

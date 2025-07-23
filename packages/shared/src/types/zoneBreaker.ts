export interface ZoneBreakerConfig {
  /** Sprite asset for the player */
  playerAsset: string;
  /** Optional scale for the player sprite */
  playerScale?: number;
  levels: LevelConfig[]; // Array of levels for Arcade mode
  winPercentage: number; // Default 75
  playerSpeed: number;
  playerAsset: string;
  playerScale?: number;
  enemySpeed: number; // Base, per enemy type
  enemyCount: number; // Base, overridden per level
  powerUps?: PowerUp[]; // Optional
  lineStyle?: 'solid' | 'dashed' | 'energy'; // Trail visual
  trailDecay?: number; // Seconds before trail disappears if not closed
  lives: number; // Default 3
  timeLimit?: number; // Seconds per level, optional
  mode: 'arcade'; // Currently only arcade
  screenWidth: number;
  screenHeight: number;
  brushSize?: number; // For drawing, but now for trail width
}

interface LevelConfig {
  backgroundImage: string;
  enemyTypes: EnemyType[]; // Custom per level
  enemyCount: number;
  powerUpCount?: number;
  timeLimit?: number; // Override global
}

interface EnemyType {
  type: 'core' | 'chaser' | 'zigzag' | 'bouncer' | 'projectile' | 'bomb';
  asset: string;
  speed: number;
  behavior: 'roam' | 'borderChase' | 'zigzag' | 'bounce' | 'shoot' | 'explode';
}

interface PowerUp {
  type: 'speed' | 'shield' | 'freeze' | 'bomb';
  asset: string;
}
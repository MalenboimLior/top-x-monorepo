// New packages/shared/types/territoryCapture.ts
export interface TerritoryCaptureConfig {
  backgroundImage: string; // URL to the background image to reveal
  playerAsset: string; // URL to player sprite/image
  playerSpeed: number; // Player movement speed
  playerScale?: number; // Optional scale for player
  enemyAssets: string[]; // Array of URLs to enemy sprites/images
  enemySpeed: number; // Base speed for enemies
  enemyCount: number; // Number of enemies
  enemyMovements?: ('horizontal' | 'vertical' | 'random')[]; // Movement patterns for enemies
  screenWidth: number; // Game canvas width
  screenHeight: number; // Game canvas height
  winPercentage: number; // Percentage of territory to capture to win (0-100)
  lives: number; // Starting lives
  brushSize?: number; // Size of the "paint brush" for revealing territory
  powerUps?: { type: 'speed' | 'invincible'; asset: string }[]; // Optional power-ups
  powerUpCount?: number; // Number of power-ups to spawn
}
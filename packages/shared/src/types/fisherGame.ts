// packages/shared/src/types/fisherGame.ts
export interface CatchConfig {
  depthMin: number;
  depthMax: number;
  item: string;
  value: number;
  rarity: number;
}

export interface UpgradeConfig {
  type: 'maxFish' | 'maxDepth' | 'offlineEarnings';
  baseCost: number;
  increment: number;
  maxLevel?: number;
}

export interface FisherGameLevelConfig {
  catchConfig: CatchConfig[];
  upgradeConfig: UpgradeConfig[];
  backgroundImage: string;
  levelHeader: string;
}

export interface FisherGameConfig {
  levelsConfig: FisherGameLevelConfig[];
  backgroundImage: string;
  fishermanImage: string;
  hookSpeed: number;
  offlineRate: number;
}
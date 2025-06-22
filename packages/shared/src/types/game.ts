// Type definitions for games and game types
export interface GameType {
  id: string;
  name: string;
  description: string;
  custom?: Record<string, any>;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  gameHeader?: string;
  poolHeader?: string;
  wordtHeader?: string;
  shareText?: string;
  custom?: Record<string, any>;
}
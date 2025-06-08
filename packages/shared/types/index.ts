export * from './user';
export * from './tierData';

export interface GameType {
  id: string;
  name: string;
  description: string;
  schemaVersion: number;
}

export interface Game {
  id: string;
  gameTypeId: string;
  title: string;
  description: string;
  createdAt: string;
  isActive: boolean;
  config: Record<string, any>;
}

export interface TriviaQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  category?: string;
}

export interface TierTableItem {
  id: string;
  name: string;
  description: string;
  imageURL?: string;
}
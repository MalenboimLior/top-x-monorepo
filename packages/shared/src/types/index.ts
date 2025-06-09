export * from './user';
export * from './tierData';
export * from './pyramid';

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
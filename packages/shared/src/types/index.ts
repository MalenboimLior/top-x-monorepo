// Barrel file exporting common shared types
export * from './user';
export * from './pyramid';

export interface TriviaQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  category?: string;
}

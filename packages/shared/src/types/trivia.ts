export interface TriviaQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  category?: string;
}

export interface TriviaConfig {
  questions: TriviaQuestion[];
}
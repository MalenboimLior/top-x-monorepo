import type { TriviaQuestion } from '@top-x/shared/types/trivia';
import type { TriviaQuestionViewModel } from './types';

/**
 * Convert TriviaQuestion to TriviaQuestionViewModel
 * Converts answers array to options array format
 */
export function toViewModel(question: TriviaQuestion): TriviaQuestionViewModel {
  // Convert answers array to options array
  const options = question.answers.map((answer) => {
    // If answer has imageUrl, return object format, otherwise just text
    if (answer.imageUrl) {
      return { text: answer.text, imageUrl: answer.imageUrl };
    }
    return answer.text;
  });

  return {
    id: question.id,
    question: question.text,
    options,
    correctHash: question.hash,
    difficulty: question.difficulty,
    media: question.imageUrl ? { imageUrl: question.imageUrl } : undefined,
    salt: question.salt,
    category: question.category,
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

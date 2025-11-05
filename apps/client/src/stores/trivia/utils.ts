import type { TriviaQuestion } from '@top-x/shared/types/trivia';
import type { TriviaQuestionViewModel } from './types';

export function toViewModel(question: TriviaQuestion): TriviaQuestionViewModel {
  const prompt = question.text ?? question.id;
  return {
    id: question.id,
    prompt,
    question: prompt,
    options: [...(question.options ?? [])],
    correctHash: (question as Record<string, unknown>).correctHash as string | undefined ?? question.hash,
    difficulty: question.difficulty,
    media: question.media,
    timerSeconds: question.timerSeconds,
    salt: question.salt,
    group: question.category,
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

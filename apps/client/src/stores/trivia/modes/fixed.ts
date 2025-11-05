import { ref } from 'vue';
import type { TriviaModeController, FixedModeControllerOptions, TriviaQuestionViewModel } from '../types';
import { toViewModel } from '../utils';

export function createFixedModeController(options: FixedModeControllerOptions): TriviaModeController {
  const queue = ref<TriviaQuestionViewModel[]>([]);
  const answeredCount = ref(0);
  const requestedIds = new Set<string>();
  const inlineQuestions: TriviaQuestionViewModel[] = options.config?.questions?.map(toViewModel) ?? [];
  const isInlineOnly = options.config?.questionSource === 'inline';
  let inlineCursor = 0;

  function targetTotal(): number {
    if (isInlineOnly) {
      return inlineQuestions.length;
    }
    if (typeof options.config?.totalQuestions === 'number' && options.config.totalQuestions > 0) {
      return options.config.totalQuestions;
    }
    if (options.config?.questions?.length) {
      return options.config.questions.length;
    }
    return 10;
  }

  function remainingNeeded(): number {
    return Math.max(0, targetTotal() - (answeredCount.value + queue.value.length));
  }

  async function ensureQuestions(): Promise<void> {
    let needed = remainingNeeded();
    if (needed <= 0) {
      return;
    }

    if (inlineCursor < inlineQuestions.length) {
      const available = inlineQuestions.slice(inlineCursor, inlineCursor + needed);
      queue.value.push(...available);
      inlineCursor += available.length;
      needed = remainingNeeded();
    }

    if (needed <= 0) {
      return;
    }

    if (isInlineOnly || !options.fetchQuestions) {
      return;
    }

    const fetched = await options.fetchQuestions(needed, Array.from(requestedIds));
    fetched.forEach((question) => {
      if (!requestedIds.has(question.id)) {
        queue.value.push(toViewModel(question));
        requestedIds.add(question.id);
      }
    });
  }

  function nextQuestion(): TriviaQuestionViewModel | null {
    return queue.value.shift() ?? null;
  }

  function recordAnswer(_: { correct: boolean }): void {
    answeredCount.value += 1;
  }

  function reset(): void {
    queue.value = [];
    answeredCount.value = 0;
    requestedIds.clear();
    inlineCursor = 0;
  }

  function isComplete(): boolean {
    return answeredCount.value >= targetTotal();
  }

  return {
    reset,
    ensureQuestions,
    nextQuestion,
    recordAnswer,
    isComplete,
  };
}

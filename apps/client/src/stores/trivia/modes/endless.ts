import { ref } from 'vue';
import type { TriviaModeController, EndlessModeControllerOptions, TriviaQuestionViewModel } from '../types';
import { toViewModel } from '../utils';

export function createEndlessModeController(options: EndlessModeControllerOptions): TriviaModeController {
  const queue = ref<TriviaQuestionViewModel[]>([]);
  const requestedIds = new Set<string>();
  const cursor = ref<string | null>(null);
  const hasMore = ref(true);

  const minimumBuffer = () => Math.max(2, options.config?.questionBatchSize ?? 5);

  async function ensureQuestions(): Promise<void> {
    if (!hasMore.value && queue.value.length > 0) {
      return;
    }

    if (queue.value.length >= minimumBuffer()) {
      return;
    }

    if (!options.fetchBatch) {
      return;
    }

    const batchSize = options.config?.questionBatchSize ?? 5;
    const { questions, cursor: nextCursor, hasMore: more } = await options.fetchBatch(
      batchSize,
      cursor.value,
      Array.from(requestedIds)
    );

    questions.forEach((question) => {
      if (!requestedIds.has(question.id)) {
        queue.value.push(toViewModel(question));
        requestedIds.add(question.id);
      }
    });

    cursor.value = nextCursor;
    hasMore.value = more;
  }

  function nextQuestion(): TriviaQuestionViewModel | null {
    if (queue.value.length === 0) {
      return null;
    }
    return queue.value.shift() ?? null;
  }

  function recordAnswer(_: { correct: boolean }): void {
    // Endless mode relies on timers/lives to end the session.
  }

  function reset(): void {
    queue.value = [];
    requestedIds.clear();
    cursor.value = null;
    hasMore.value = true;
  }

  function isComplete(): boolean {
    return false;
  }

  return {
    reset,
    ensureQuestions,
    nextQuestion,
    recordAnswer,
    isComplete,
  };
}

import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
// @ts-ignore -- resolved via tsconfig paths
import type { User, UserGameDataSubmission } from '@top-x/shared/types/user';
// @ts-ignore -- resolved via tsconfig paths
import type { TriviaConfig, TriviaQuestion, TriviaPowerUpRule, TriviaAnswer } from '@top-x/shared/types/trivia';
import {
  type TriviaQuestionViewModel,
  type TriviaAttemptPayload,
  type PowerUpState,
  type TriviaAnswerReview,
} from './types';
import { nowIso, toViewModel } from './utils';
// @ts-ignore -- resolved via tsconfig paths
import { hashAnswer, shuffleArray } from '@/services/trivia';
import { doc, getDoc } from 'firebase/firestore';
import { fetchTriviaQuestions, type FetchTriviaQuestionsResponse, type TriviaQuestionPayload } from '../../services/triviaApi';
import {
  db,
  calculateTriviaSpeedBonus,
  TRIVIA_PER_QUESTION_BASE_POINTS,
  TRIVIA_STREAK_BONUS_STEP,
} from '@top-x/shared';
import { useUserStore } from '../user';

interface TriviaLeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
}

interface InviterSnapshot {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
}

const GAME_ID = 'smartest_on_x';
const GAME_TYPE_ID = 'trivia';
const DEFAULT_LIVES = 3;
const DEFAULT_QUESTION_TIMER = 15;
const REVIEW_DELAY_MS = 2000;

export const useTriviaStore = defineStore('trivia', () => {
  const userStore = useUserStore();

  const currentScreen = ref<'start' | 'playing' | 'gameover'>('start');
  const activeGameId = ref<string>(GAME_ID);
  const baseConfig = ref<TriviaConfig | null>(null);
  const overrideConfig = ref<TriviaConfig | null>(null);
  const configLoaded = ref(false);
  const activeDailyChallengeId = ref<string | null>(null);

  const currentQuestion = ref<TriviaQuestionViewModel | null>(null);
  const selectedAnswer = ref<number | null>(null);
  const isCorrect = ref<boolean | null>(null);
  const lives = ref(DEFAULT_LIVES);
  const score = ref(0);
  const streak = ref(0);
  const sessionBestStreak = ref(0);
  const bestScore = ref(0);
  const bestStreak = ref(0);
  const speedBonusTotal = ref(0);
  const lastSpeedBonus = ref(0);
  const lastStreakBonus = ref(0);
  const leaderboard = ref<TriviaLeaderboardEntry[]>([]);
  const isLoading = ref(false);
  const inviter = ref<InviterSnapshot | null>(null);

  const questionTimerDuration = ref(DEFAULT_QUESTION_TIMER);
  const questionTimeLeft = ref(DEFAULT_QUESTION_TIMER);
  const globalTimeLeft = ref<number | null>(null);
  const questionTimerHandle = ref<ReturnType<typeof setInterval> | null>(null);
  const globalTimerHandle = ref<ReturnType<typeof setInterval> | null>(null);

  const attempts = ref<TriviaAttemptPayload[]>([]);
  const answeredQuestionIds = ref<string[]>([]);
  const questionOrder = ref<string[]>([]);
  const correctAttempts = ref(0);
  const powerUps = ref<PowerUpState[]>([]);
  const isReviewingAnswer = ref(false);
  const correctAnswerIndex = ref<number | null>(null);
  const answerReview = ref<TriviaAnswerReview[]>([]);

  // Question management for fixed mode
  const allQuestions = ref<TriviaQuestion[]>([]);
  const questionQueue = ref<TriviaQuestionViewModel[]>([]);
  const currentBatchIndex = ref(0);
  const totalQuestionsCount = ref(0);
  const hasMoreQuestions = ref(false);
  const isFetchingQuestions = ref(false);
  const knownQuestionIds = new Set<string>();

  const pendingScore = ref<number | null>(null);
  const pendingBestStreak = ref<number | null>(null);

  const activeConfig = computed(() => overrideConfig.value ?? baseConfig.value);
  const unlimitedLives = computed(() => Boolean(activeConfig.value?.unlimitedLives));
  const hasPowerUps = computed(() => Boolean(activeConfig.value?.powerUps && activeConfig.value.powerUps.length > 0));

interface LegacyTriviaAnswer {
  text?: string;
  label?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  image?: string | null;
}

interface LegacyTriviaQuestion extends Partial<TriviaQuestion> {
  options?: Array<string | LegacyTriviaAnswer>;
  correct?: number;
  question?: string;
  prompt?: string;
  media?: {
    imageUrl?: string;
    image_url?: string;
    optionImageUrls?: Array<string | null>;
  };
  correctHash?: unknown;
  correctHashes?: unknown;
}

function extractHashValue(source: unknown): string | undefined {
  if (!source) {
    return undefined;
  }

  if (typeof source === 'string') {
    return source;
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      const value = extractHashValue(entry);
      if (value) {
        return value;
      }
    }
    return undefined;
  }

  if (typeof source === 'object') {
    const record = source as Record<string, unknown>;
    const keysToCheck = ['value', 'hash', 'correct', 'primary', 'default'];
    for (const key of keysToCheck) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate) {
        return candidate;
      }
    }
    // Some callers might just store string values under arbitrary keys
    for (const candidate of Object.values(record)) {
      if (typeof candidate === 'string' && candidate) {
        return candidate;
      }
    }
  }

  return undefined;
}

function createQuestionId() {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQuestion(question: TriviaQuestion | LegacyTriviaQuestion): TriviaQuestion {
  const legacy = question as LegacyTriviaQuestion & Record<string, unknown>;

  const normalized: TriviaQuestion = {
    id: (legacy.id as string | undefined) ?? createQuestionId(),
    text: (legacy.text as string | undefined) ?? (legacy.question as string | undefined) ?? (legacy.prompt as string | undefined) ?? '',
    answers: [],
    correctAnswer: (legacy.correctAnswer as string | undefined) ?? undefined,
    category: legacy.category,
    difficulty: legacy.difficulty,
    salt: legacy.salt,
    hash:
      extractHashValue(legacy.hash) ??
      extractHashValue(legacy.correctHash) ??
      extractHashValue(legacy.correctHashes),
    imageUrl:
      (legacy.imageUrl as string | undefined) ??
      (legacy.media?.imageUrl as string | undefined) ??
      (legacy.media?.image_url as string | undefined),
  };

  let answersSource: Array<string | LegacyTriviaAnswer> | undefined;
  const legacyAnswers = legacy.answers as Array<string | LegacyTriviaAnswer> | undefined;
  if (legacyAnswers && legacyAnswers.length) {
    answersSource = legacyAnswers;
  } else if (legacy.options && legacy.options.length) {
    answersSource = legacy.options;
  }

  if (answersSource) {
    normalized.answers = answersSource.map((option, index): TriviaAnswer => {
      if (typeof option === 'string') {
        return {
          text: option,
          imageUrl: legacy.media?.optionImageUrls?.[index] || undefined,
        };
      }

      const text = option.text || option.label || '';
      const imageUrl = option.imageUrl || option.image_url || option.image || legacy.media?.optionImageUrls?.[index] || undefined;
      return {
        text,
        imageUrl: imageUrl || undefined,
      };
    });
  }

  if (!normalized.answers.length) {
    normalized.answers = [{ text: '' }];
  }

  const hasMatchingCorrect =
    normalized.correctAnswer !== undefined &&
    normalized.answers.some((answer: TriviaAnswer) => answer.text === normalized.correctAnswer);

  if (!hasMatchingCorrect) {
    if (typeof legacy.correct === 'number' && legacy.correct >= 0 && legacy.correct < normalized.answers.length) {
      normalized.correctAnswer = normalized.answers[legacy.correct]?.text ?? undefined;
    } else if (normalized.correctAnswer) {
      // Provided correct answer does not match any option; clear it
      delete normalized.correctAnswer;
    }
  }

  return normalized;
}

function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

function toReviewOptions(question: TriviaQuestionViewModel): TriviaAnswerReview['options'] {
  return question.options.map((option) => {
    if (typeof option === 'string') {
      return { text: option };
    }
    return {
      text: option.text,
      imageUrl: option.imageUrl,
    };
  });
}

async function determineCorrectOptionIndex(question: TriviaQuestionViewModel | null): Promise<number | null> {
  if (!question?.correctHash) {
    if (question) {
      console.warn('[Trivia] Missing correct hash for question; cannot determine answer', {
        id: question.id,
        options: question.options,
      });
    }
    return null;
  }

  const attemptedHashes: { option: string; hash: string }[] = [];

  for (let i = 0; i < question.options.length; i++) {
    const option = question.options[i];
    let answerText: string;
    
    if (typeof option === 'string') {
      answerText = option;
    } else {
      // For image-only answers (no text), use the index as the answer identifier
      // This matches how the builder hashes image-only answers
      if (!option.text || option.text.trim() === '') {
        // Image-only answer: use index as string (matches builder logic)
        answerText = i.toString();
      } else {
        answerText = option.text;
      }
    }
    
    const hash = await hashAnswer(question.id, answerText, question.salt);
    attemptedHashes.push({ option: answerText, hash });
    if (hash === question.correctHash) {
      return i;
    }
  }

  console.warn('[Trivia] No option hash matched correct hash', {
    id: question.id,
    correctHash: question.correctHash,
    attemptedHashes,
  });

  return null;
}

  let ongoingFetch: Promise<FetchTriviaQuestionsResponse | null> | null = null;

  async function ensureConfig(): Promise<void> {
    if (configLoaded.value) {
      console.log('[Trivia] Config already loaded, skipping');
      return;
    }

    console.log('[Trivia] Loading config via Cloud Function...');
    isLoading.value = true;
    try {
      const response = await fetchAndStoreQuestions({ includeConfig: true });
      if (response?.config) {
        baseConfig.value = {
          ...(response.config as TriviaConfig),
          questions: [],
        };
      } else if (!baseConfig.value) {
        console.warn('[Trivia] No config returned, using defaults');
        baseConfig.value = { mode: 'classic', questions: [], lives: DEFAULT_LIVES };
      }

      if (questionQueue.value.length === 0 && allQuestions.value.length === 0) {
        console.warn('[Trivia] No questions fetched, adding default fallback');
        integrateQuestions([createDefaultQuestion()]);
        if (totalQuestionsCount.value === 0) {
          totalQuestionsCount.value = allQuestions.value.length;
          hasMoreQuestions.value = false;
        }
      }

      lives.value = unlimitedLives.value ? Infinity : (baseConfig.value?.lives ?? DEFAULT_LIVES);
      configLoaded.value = true;
      console.log('[Trivia] Config loaded successfully:', {
        totalQuestions: totalQuestionsCount.value,
        queueLength: questionQueue.value.length,
        hasMore: hasMoreQuestions.value,
      });
    } catch (error) {
      console.error('[Trivia] Failed to load trivia config', error);
      baseConfig.value = { mode: 'fixed', questions: [], lives: DEFAULT_LIVES };
      integrateQuestions([createDefaultQuestion()]);
      if (totalQuestionsCount.value === 0) {
        totalQuestionsCount.value = allQuestions.value.length;
        hasMoreQuestions.value = false;
      }
      lives.value = DEFAULT_LIVES;
      configLoaded.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  function integrateQuestions(payloads: Array<TriviaQuestionPayload | TriviaQuestion>): void {
    const newViewModels: TriviaQuestionViewModel[] = [];

    payloads.forEach((payload) => {
      const normalized = normalizeQuestion(payload as TriviaQuestion | LegacyTriviaQuestion);
      if (!normalized.id || knownQuestionIds.has(normalized.id) || answeredQuestionIds.value.includes(normalized.id)) {
        return;
      }

      knownQuestionIds.add(normalized.id);
      allQuestions.value.push(normalized);

      try {
        const viewModel = toViewModel(normalized);
        newViewModels.push(viewModel);
      } catch (error) {
        console.error('[Trivia] Error converting question to view model:', normalized, error);
      }
    });

    if (newViewModels.length > 0) {
      const questionsToAdd = activeConfig.value?.shuffleQuestions
        ? shuffleArray(newViewModels)
        : newViewModels;
      questionQueue.value.push(...questionsToAdd);
      console.log('[Trivia] Added questions to queue:', {
        added: questionsToAdd.length,
        queueLength: questionQueue.value.length,
        shuffled: activeConfig.value?.shuffleQuestions ?? false,
      });
    }
  }

  async function fetchAndStoreQuestions(options: { limit?: number; includeConfig?: boolean } = {}): Promise<FetchTriviaQuestionsResponse | null> {
    if (ongoingFetch) {
      return ongoingFetch;
    }

    const { limit, includeConfig } = options;
    const excludeIds = Array.from(new Set([...answeredQuestionIds.value, ...Array.from(knownQuestionIds)]));

    ongoingFetch = (async (): Promise<FetchTriviaQuestionsResponse | null> => {
      isFetchingQuestions.value = true;
      try {
        const response = await fetchTriviaQuestions({
          gameId: activeGameId.value,
          excludeIds,
          limit,
          includeConfig,
        });

        totalQuestionsCount.value = response.totalQuestions;
        hasMoreQuestions.value = response.hasMore;
        integrateQuestions(response.questions);
        return response;
      } finally {
        isFetchingQuestions.value = false;
        ongoingFetch = null;
      }
    })();

    return ongoingFetch;
  }

  function createDefaultQuestion(): TriviaQuestion {
    return {
      id: 'default-1',
      text: 'What is 1 + 1?',
      answers: [
        { text: '1' },
        { text: '2' },
        { text: '3' },
        { text: '4' },
      ],
      correctAnswer: '2',
      category: 'math',
      difficulty: 'very_easy',
    };
  }

  function resetTimers(): void {
    if (questionTimerHandle.value) {
      clearInterval(questionTimerHandle.value);
      questionTimerHandle.value = null;
    }
    if (globalTimerHandle.value) {
      clearInterval(globalTimerHandle.value);
      globalTimerHandle.value = null;
    }
  }

  function startGlobalTimer(): void {
    if (unlimitedLives.value || !activeConfig.value?.globalTimer?.enabled) {
      globalTimeLeft.value = null;
      if (globalTimerHandle.value) {
        clearInterval(globalTimerHandle.value);
        globalTimerHandle.value = null;
      }
      return;
    }

    const duration = activeConfig.value?.globalTimer?.durationSeconds ?? 0;
    globalTimeLeft.value = duration > 0 ? duration : null;
    if (!globalTimeLeft.value) {
      return;
    }

    if (globalTimerHandle.value) {
      clearInterval(globalTimerHandle.value);
    }

    globalTimerHandle.value = setInterval(() => {
      if (globalTimeLeft.value === null) {
        return;
      }
      globalTimeLeft.value -= 1;
      if (globalTimeLeft.value <= 0) {
        globalTimeLeft.value = 0;
        if (globalTimerHandle.value) {
          clearInterval(globalTimerHandle.value);
          globalTimerHandle.value = null;
        }
        endGame();
      }
    }, 1000);
  }

  function startQuestionTimer(question: TriviaQuestionViewModel): void {
    if (unlimitedLives.value) {
      // No timer in unlimited lives mode
      questionTimerDuration.value = 0;
      questionTimeLeft.value = 0;
      return;
    }

    const timerSeconds = question.timerSeconds ?? DEFAULT_QUESTION_TIMER;
    questionTimerDuration.value = timerSeconds;
    questionTimeLeft.value = timerSeconds;
    if (questionTimerHandle.value) {
      clearInterval(questionTimerHandle.value);
    }

    questionTimerHandle.value = setInterval(() => {
      questionTimeLeft.value -= 1;
      if (questionTimeLeft.value <= 0) {
        questionTimeLeft.value = 0;
        if (questionTimerHandle.value) {
          clearInterval(questionTimerHandle.value);
          questionTimerHandle.value = null;
        }
        handleTimeout();
      }
    }, 1000);
  }

  function updateBestStreaks(): void {
    sessionBestStreak.value = Math.max(sessionBestStreak.value, streak.value);
    bestStreak.value = Math.max(bestStreak.value, sessionBestStreak.value);
  }

  async function prepareNextQuestion(): Promise<void> {
    console.log('[Trivia] prepareNextQuestion called:', {
      queueLength: questionQueue.value.length,
      allQuestionsCount: allQuestions.value.length,
      answeredCount: answeredQuestionIds.value.length,
    });

    isReviewingAnswer.value = false;
    correctAnswerIndex.value = null;

    // Check if we need to load more questions
    if (questionQueue.value.length === 0 && allQuestions.value.length > answeredQuestionIds.value.length) {
      console.log('[Trivia] Queue empty, loading questions...');
      await ensureQuestionsLoaded();
    }

    // Get next question from queue
    let next = questionQueue.value.shift();
    if (!next) {
      console.log('[Trivia] No question in queue, trying to load more...');
      // Check if we can load more
      await ensureQuestionsLoaded();
      next = questionQueue.value.shift();
      if (!next) {
        // No more questions - check if we have any questions at all
        if (allQuestions.value.length === 0) {
          console.warn('[Trivia] No questions available, adding default question');
          allQuestions.value = [createDefaultQuestion()];
          await ensureQuestionsLoaded();
          next = questionQueue.value.shift();
        }
        if (!next) {
          // Still no questions - end game
          console.warn('[Trivia] No questions available, ending game');
          endGame();
          return;
        }
      }
    }

    if (!next) {
      console.error('[Trivia] Failed to get next question');
      endGame();
      return;
    }

    console.log('[Trivia] Preparing question:', {
      id: next.id,
      question: next.question.substring(0, 50) + '...',
      optionsCount: next.options.length,
    });

    const optionsToDisplay = activeConfig.value?.shuffleAnswers
      ? shuffleArray([...next.options])
      : [...next.options];
    const displayedQuestion: TriviaQuestionViewModel = {
      ...next,
      options: optionsToDisplay,
    };

    currentQuestion.value = displayedQuestion;
    correctAnswerIndex.value = await determineCorrectOptionIndex(displayedQuestion);

    questionOrder.value.push(next.id);
    selectedAnswer.value = null;
    isCorrect.value = null;
    startQuestionTimer(displayedQuestion);
    console.log('[Trivia] Question displayed successfully');
  }

  async function ensureQuestionsLoaded(): Promise<void> {
    console.log('[Trivia] ensureQuestionsLoaded:', {
      totalQuestions: totalQuestionsCount.value,
      fetchedQuestions: allQuestions.value.length,
      queueLength: questionQueue.value.length,
      answeredCount: answeredQuestionIds.value.length,
      hasMore: hasMoreQuestions.value,
      isFetching: isFetchingQuestions.value,
    });

    if (questionQueue.value.length > 0) {
      return;
    }

    const shouldFetchMore =
      hasMoreQuestions.value ||
      !configLoaded.value ||
      allQuestions.value.length === answeredQuestionIds.value.length;

    if (shouldFetchMore) {
      await fetchAndStoreQuestions({ limit: activeConfig.value?.questionBatchSize });
    }

    if (questionQueue.value.length === 0 && allQuestions.value.length === 0) {
      integrateQuestions([createDefaultQuestion()]);
      if (totalQuestionsCount.value === 0) {
        totalQuestionsCount.value = allQuestions.value.length;
        hasMoreQuestions.value = false;
      }
    }
  }

  function spawnPowerUp(): void {
    if (!hasPowerUps.value || !activeConfig.value?.powerUps?.length) {
      return;
    }

    const available = activeConfig.value.powerUps.filter(
      (rule: TriviaPowerUpRule) => !powerUps.value.find((p) => (p as TriviaPowerUpRule).id === rule.id)
    );
    if (!available.length) {
      return;
    }

    const nextPowerUp = available[Math.floor(Math.random() * available.length)];
    powerUps.value.push({
      ...(nextPowerUp as TriviaPowerUpRule),
      availableAt: Date.now(),
      uses: 0,
    } as PowerUpState);
  }

  interface AttemptMetadata {
    durationSeconds?: number;
    timeRemainingSeconds?: number;
  }

  async function recordAttempt(
    question: TriviaQuestionViewModel,
    answerIndex: number,
    metadata?: AttemptMetadata,
  ): Promise<{ hash: string; attempt: TriviaAttemptPayload }> {
    // Get the answer text from the option
    const option = question.options[answerIndex];
    let answerText: string;
    
    if (typeof option === 'string') {
      answerText = option;
    } else {
      // For image-only answers (no text), use the index as the answer identifier
      // This matches how the builder hashes image-only answers
      if (!option.text || option.text.trim() === '') {
        // Image-only answer: use index as string (matches builder logic)
        answerText = answerIndex.toString();
      } else {
        answerText = option.text;
      }
    }
    
    const hash = await hashAnswer(question.id, answerText, question.salt);
    const attemptEntry: TriviaAttemptPayload = {
      questionId: question.id,
      answerHash: hash,
      answeredAt: nowIso(),
      durationSeconds: metadata?.durationSeconds,
      timeRemainingSeconds: metadata?.timeRemainingSeconds,
    };
    attempts.value.push(attemptEntry);
    answeredQuestionIds.value.push(question.id);
    return { hash, attempt: attemptEntry };
  }

  function applyIncorrectAnswer(): void {
    lastSpeedBonus.value = 0;
    lastStreakBonus.value = 0;
    if (!unlimitedLives.value) {
      lives.value -= 1;
    }
    streak.value = 0;
    updateBestStreaks();
  }

  interface CorrectAnswerOptions {
    speedBonus?: number;
  }

  function applyCorrectAnswer(options?: CorrectAnswerOptions): void {
    streak.value += 1;
    updateBestStreaks();

    const basePoints = TRIVIA_PER_QUESTION_BASE_POINTS;
    const streakBonus = Math.max(0, streak.value - 1) * TRIVIA_STREAK_BONUS_STEP;
    const speedBonus = Math.max(0, options?.speedBonus ?? 0);
    score.value += basePoints + streakBonus + speedBonus;
    speedBonusTotal.value += speedBonus;
    lastSpeedBonus.value = speedBonus;
    lastStreakBonus.value = streakBonus;

    correctAttempts.value += 1;

    // Only add lives back if not unlimited and lives are configured
    if (!unlimitedLives.value && activeConfig.value?.lives && streak.value > 0 && streak.value % 5 === 0) {
      lives.value = Math.min(activeConfig.value.lives, lives.value + 1);
    }

    spawnPowerUp();
  }

  async function handleTimeout(): Promise<void> {
    if (!currentQuestion.value) {
      return;
    }

    if (questionTimerHandle.value) {
      clearInterval(questionTimerHandle.value);
      questionTimerHandle.value = null;
    }

    const questionSnapshot = currentQuestion.value;

    // Record timeout as incorrect
    const answerText = 'timeout';
    const hash = await hashAnswer(questionSnapshot.id, answerText, questionSnapshot.salt);
    attempts.value.push({
      questionId: questionSnapshot.id,
      answerHash: hash,
      answeredAt: nowIso(),
      durationSeconds: questionTimerDuration.value,
      timeRemainingSeconds: 0,
      speedBonus: 0,
    });
    answeredQuestionIds.value.push(questionSnapshot.id);

    selectedAnswer.value = -1;
    isCorrect.value = false;
    isReviewingAnswer.value = true;
    applyIncorrectAnswer();

    const reviewOptions = toReviewOptions(questionSnapshot);
    const correctIndex =
      correctAnswerIndex.value ?? (await determineCorrectOptionIndex(questionSnapshot));
    answerReview.value.push({
      questionId: questionSnapshot.id,
      question: questionSnapshot.question,
      options: reviewOptions,
      selectedIndex: null,
      correctIndex,
      isCorrect: false,
    });

    const outOfLives = !unlimitedLives.value && lives.value <= 0;
    const totalQuestions = totalQuestionsCount.value;
    const answeredAll =
      totalQuestions > 0 && answeredQuestionIds.value.length >= totalQuestions;

    await sleep(REVIEW_DELAY_MS);

    if (outOfLives) {
      endGame();
      return;
    }

    if (answeredAll) {
      endGame();
      return;
    }

    await prepareNextQuestion();
  }

  async function answerQuestion(index: number): Promise<void> {
    console.log('[Trivia] answerQuestion called:', {
      index,
      hasCurrentQuestion: !!currentQuestion.value,
      alreadyAnswered: selectedAnswer.value !== null,
    });

    if (!currentQuestion.value || selectedAnswer.value !== null) {
      console.warn('[Trivia] Cannot answer - no question or already answered');
      return;
    }

    if (questionTimerHandle.value && !unlimitedLives.value) {
      clearInterval(questionTimerHandle.value);
      questionTimerHandle.value = null;
    }

    const questionSnapshot = currentQuestion.value;
    const durationSeconds = questionTimerDuration.value;
    const timeRemainingSeconds = questionTimeLeft.value;
    selectedAnswer.value = index;
    const { hash: answerHash, attempt: attemptEntry } = await recordAttempt(
      questionSnapshot,
      index,
      {
        durationSeconds,
        timeRemainingSeconds,
      },
    );
    
    // Validate answer by comparing hash
    const option = questionSnapshot.options[index];
    let answerText: string;
    if (typeof option === 'string') {
      answerText = option;
    } else {
      // For image-only answers (no text), use the index as the answer identifier
      // This matches how the builder hashes image-only answers
      if (!option.text || option.text.trim() === '') {
        // Image-only answer: use index as string (matches builder logic)
        answerText = index.toString();
      } else {
        answerText = option.text;
      }
    }
    const expectedHash = questionSnapshot.correctHash;
    const correct = expectedHash ? expectedHash === answerHash : false;
    const speedBonus = correct
      ? calculateTriviaSpeedBonus(timeRemainingSeconds, durationSeconds)
      : 0;
    if (speedBonus > 0) {
      attemptEntry.speedBonus = speedBonus;
    }
    
    console.log('[Trivia] Answer validation:', {
      answerText,
      answerHash,
      expectedHash,
      correct,
      durationSeconds,
      timeRemainingSeconds,
      speedBonus,
    });
    
    isCorrect.value = correct;
    isReviewingAnswer.value = true;

    if (correct) {
      console.log('[Trivia] Correct answer! Score:', score.value, 'Streak:', streak.value);
      applyCorrectAnswer({ speedBonus });
    } else {
      console.log('[Trivia] Incorrect answer. Lives:', lives.value, 'Streak:', streak.value);
      applyIncorrectAnswer();
    }

    bestScore.value = Math.max(bestScore.value, score.value);

    const reviewOptions = toReviewOptions(questionSnapshot);
    const correctIndex =
      correctAnswerIndex.value ?? (await determineCorrectOptionIndex(questionSnapshot));
    answerReview.value.push({
      questionId: questionSnapshot.id,
      question: questionSnapshot.question,
      options: reviewOptions,
      selectedIndex: index,
      correctIndex,
      isCorrect: correct,
    });

    const outOfLives = !unlimitedLives.value && lives.value <= 0;
    const totalQuestions = totalQuestionsCount.value;
    const answeredAll =
      totalQuestions > 0 && answeredQuestionIds.value.length >= totalQuestions;

    await sleep(REVIEW_DELAY_MS);

    if (outOfLives) {
      console.log('[Trivia] No lives left after review, ending game');
      endGame();
      return;
    }

    if (answeredAll) {
      console.log('[Trivia] All questions answered after review, ending game');
      endGame();
      return;
    }

    console.log('[Trivia] Preparing next question after review window...');
    await prepareNextQuestion();
  }

  function resetGameState(): void {
    resetTimers();
    attempts.value = [];
    answeredQuestionIds.value = [];
    questionOrder.value = [];
    correctAttempts.value = 0;
    powerUps.value = [];
    isReviewingAnswer.value = false;
    answerReview.value = [];
    correctAnswerIndex.value = null;
    streak.value = 0;
    sessionBestStreak.value = 0;
    selectedAnswer.value = null;
    isCorrect.value = null;
    score.value = 0;
    speedBonusTotal.value = 0;
    lastSpeedBonus.value = 0;
    lastStreakBonus.value = 0;
    lives.value = unlimitedLives.value ? Infinity : (activeConfig.value?.lives ?? DEFAULT_LIVES);
    currentQuestion.value = null;
    questionQueue.value = [];
    currentBatchIndex.value = 0;
    questionTimerDuration.value = DEFAULT_QUESTION_TIMER;
    questionTimeLeft.value = DEFAULT_QUESTION_TIMER;
    allQuestions.value = [];
    knownQuestionIds.clear();
    totalQuestionsCount.value = 0;
    hasMoreQuestions.value = false;
    ongoingFetch = null;
    configLoaded.value = false;
  }

  async function startGame(): Promise<void> {
    console.log('[Trivia] startGame called');
    resetGameState();
    
    console.log('[Trivia] After resetGameState:', {
      allQuestionsCount: allQuestions.value.length,
      queueLength: questionQueue.value.length,
    });
    
    await ensureConfig();

    console.log('[Trivia] Starting game with:', {
      totalQuestions: allQuestions.value.length,
      queueLength: questionQueue.value.length,
      screen: 'playing',
    });
    
    currentScreen.value = 'playing';
    startGlobalTimer();
    await prepareNextQuestion();
  }

  function updateLocalProfile(gameData: UserGameDataSubmission, gameId: string): void {
    const profileValue = userStore.profile;
    if (!profileValue) {
      return;
    }

    const existingGameData = profileValue.games?.[GAME_TYPE_ID]?.[gameId];
    const nextScore = Math.max(existingGameData?.score ?? 0, gameData.score);
    const nextStreak = Math.max(existingGameData?.streak ?? 0, gameData.streak);

    const existingGames = { ...(profileValue.games ?? {}) };
    const existingTypeGames = { ...(existingGames[GAME_TYPE_ID] ?? {}) };
    const existingTriviaCustom = (existingGameData?.custom?.trivia as Record<string, unknown> | undefined) ?? {};

    existingTypeGames[gameId] = {
      score: nextScore,
      streak: nextStreak,
      lastPlayed: gameData.lastPlayed ?? Date.now(),
      custom: {
        ...(existingGameData?.custom ?? {}),
        trivia: {
          ...existingTriviaCustom,
          // Keep only minimal data that server actually stores
          score: nextScore,
          streak: nextStreak,
          lastPlayed: gameData.lastPlayed ?? Date.now(),
        },
      },
    };

    existingGames[GAME_TYPE_ID] = existingTypeGames;

    // Update profile using the updateGameProgress method which handles the patch correctly
    // The profile will be updated via the Firestore listener
    // This is just for local optimistic update
    if (userStore.profile) {
      userStore.profile.games = existingGames;
    }
  }

  async function submitResults(): Promise<void> {
    if (!userStore.user) {
      pendingScore.value = score.value;
      pendingBestStreak.value = sessionBestStreak.value;
      return;
    }

    const payload: UserGameDataSubmission = {
      score: score.value,
      streak: sessionBestStreak.value,
      lastPlayed: Date.now(),
      custom: {
        trivia: {
          mode: mode.value,
          attemptCount: attempts.value.length,
          attempts: attempts.value,
          questionIds: questionOrder.value,
          answeredQuestionIds: answeredQuestionIds.value,
          correctCount: correctAttempts.value,
          bestStreak: sessionBestStreak.value,
          currentStreak: streak.value,
          speedBonusTotal: speedBonusTotal.value,
          lastSpeedBonus: lastSpeedBonus.value,
          lastStreakBonus: lastStreakBonus.value,
        },
      },
    };

    const currentGameId = activeGameId.value;
    try {
      await userStore.updateGameProgress(GAME_TYPE_ID, currentGameId, payload);
      updateLocalProfile(payload, currentGameId);
      pendingScore.value = null;
      pendingBestStreak.value = null;
    } catch (error) {
      console.error('submitResults failed', error);
      pendingScore.value = score.value;
      pendingBestStreak.value = sessionBestStreak.value;
    }
  }

  function endGame(): void {
    resetTimers();
    currentScreen.value = 'gameover';
    submitResults();
  }

  async function loadInviter(inviterUid: string, inviterScore: number): Promise<void> {
    try {
      const userDoc = doc(db, 'users', inviterUid);
      const snapshot = await getDoc(userDoc);
      if (!snapshot.exists()) {
        inviter.value = null;
        return;
      }
      const data = snapshot.data() as User;
      inviter.value = {
        uid: inviterUid,
        displayName: data.displayName,
        photoURL: data.photoURL || '/assets/profile.png',
        score: inviterScore,
      };
    } catch (error) {
      console.error('Failed to load inviter', error);
      inviter.value = null;
    }
  }

  async function hashAnswerForQuestion(index: number): Promise<string | null> {
    if (!currentQuestion.value) {
      return null;
    }
    const option = currentQuestion.value.options[index];
    const answerText = typeof option === 'string' ? option : option.text;
    return hashAnswer(currentQuestion.value.id, answerText, currentQuestion.value.salt);
  }

  async function saveScoreAfterLogin(): Promise<void> {
    if (!userStore.user || pendingScore.value === null) {
      return;
    }
    await submitResults();
  }

  function setGameId(gameId: string): void {
    const normalized = (gameId ?? '').trim() || GAME_ID;
    if (normalized === activeGameId.value) {
      return;
    }

    activeGameId.value = normalized;
    baseConfig.value = null;
    overrideConfig.value = null;
    configLoaded.value = false;
    activeDailyChallengeId.value = null;
    pendingScore.value = null;
    pendingBestStreak.value = null;
    leaderboard.value = [];
    inviter.value = null;
    allQuestions.value = [];
    questionQueue.value = [];
    currentBatchIndex.value = 0;
    resetGameState();
    bestScore.value = 0;
    bestStreak.value = 0;
    currentScreen.value = 'start';
  }

  function resetGame(): void {
    resetGameState();
    currentScreen.value = 'start';
    inviter.value = null;
  }

  watch(
    () => ({
      profile: userStore.profile,
      gameId: activeGameId.value,
    }),
    ({ profile, gameId }) => {
      const stats = profile?.games?.[GAME_TYPE_ID]?.[gameId];
      bestScore.value = stats?.score ?? 0;
      bestStreak.value = stats?.streak ?? 0;
    },
    { immediate: true }
  );

  watch(
    () => streak.value,
    (value) => {
      if (value > sessionBestStreak.value) {
        sessionBestStreak.value = value;
      }
    }
  );

  const timeLeft = computed(() => questionTimeLeft.value);
  const mode = computed(() => {
    const configMode = activeConfig.value?.mode;
    // Migrate old modes
    if (configMode === 'fixed') return 'classic';
    if (configMode === 'endless') return 'speed';
    return configMode ?? 'classic';
  });
  const language = computed(() => 'en');
  const showCorrectAnswers = computed(() => Boolean(activeConfig.value?.showCorrectAnswers));
  const showCorrectAnswersOnEnd = computed(() => Boolean(activeConfig.value?.showCorrectAnswersOnEnd));
  const showProgress = computed(() => activeConfig.value?.showProgress ?? true);
  const mustLogin = computed(() => Boolean(activeConfig.value?.mustLogin));
  const allowRepeats = computed(() => activeConfig.value?.allowRepeats ?? true);
  const configLives = computed(() => activeConfig.value?.lives ?? DEFAULT_LIVES);
  const theme = computed(() => ({
    primaryColor: activeConfig.value?.theme?.primaryColor ?? '#8C52FF',
    secondaryColor: activeConfig.value?.theme?.secondaryColor ?? '#FF9F1C',
    backgroundColor: activeConfig.value?.theme?.backgroundColor ?? '#0B0B0F',
  }));
  const attemptCount = computed(() => attempts.value.length);
  const correctAttemptCount = computed(() => correctAttempts.value);
  const currentQuestionNumber = computed(() => {
    if (!currentQuestion.value) {
      return attempts.value.length;
    }
    return attempts.value.length + 1;
  });
  const totalQuestions = computed(() => {
    return totalQuestionsCount.value > 0 ? totalQuestionsCount.value : null;
  });

  const dailyChallengeId = computed(() => activeDailyChallengeId.value);
  const gameId = computed(() => activeGameId.value);

  async function applyConfigOverride(
    config: TriviaConfig | null,
    options?: { dailyChallengeId?: string | null }
  ): Promise<void> {
    overrideConfig.value = config;
    activeDailyChallengeId.value = options?.dailyChallengeId ?? null;
    resetGameState();
    if (config && config.questions && config.questions.length > 0) {
      integrateQuestions(config.questions);
      totalQuestionsCount.value = config.questions.length;
      hasMoreQuestions.value = false;
      configLoaded.value = true;
      lives.value = unlimitedLives.value ? Infinity : (config.lives ?? DEFAULT_LIVES);
    } else {
      configLoaded.value = false;
      await ensureConfig();
    }
  }

  return {
    currentScreen,
    currentQuestion,
    selectedAnswer,
    isCorrect,
    correctAnswerIndex,
    lives,
    score,
    streak,
    sessionBestStreak,
    bestScore,
    bestStreak,
    leaderboard,
    isLoading,
    inviter,
    powerUps,
    isReviewingAnswer,
    timeLeft,
    questionTimerDuration,
    globalTimeLeft,
    attempts,
    speedBonusTotal,
    lastSpeedBonus,
    lastStreakBonus,
    answerReview,
    attemptCount,
    correctAttemptCount,
    currentQuestionNumber,
    totalQuestions,
    mode,
    language,
    showCorrectAnswers,
    showCorrectAnswersOnEnd,
    showProgress,
    mustLogin,
    allowRepeats,
    configLives,
    unlimitedLives,
    hasPowerUps,
    theme,
    dailyChallengeId,
    gameId,
    hashAnswer: hashAnswerForQuestion,
    loadInviter,
    startGame,
    answerQuestion,
    resetGame,
    saveScoreAfterLogin,
    applyConfigOverride,
    setGameId,
  };
});

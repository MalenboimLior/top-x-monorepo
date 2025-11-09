import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
// @ts-ignore -- resolved via tsconfig paths
import type { Game } from '@top-x/shared/types/game';
// @ts-ignore -- resolved via tsconfig paths
import type { User, UserGameDataSubmission } from '@top-x/shared/types/user';
// @ts-ignore -- resolved via tsconfig paths
import type { TriviaConfig, TriviaQuestion, TriviaPowerUpRule, TriviaAnswer } from '@top-x/shared/types/trivia';
import {
  type TriviaQuestionViewModel,
  type TriviaAttemptPayload,
  type PowerUpState,
} from './types';
import { nowIso, toViewModel } from './utils';
// @ts-ignore -- resolved via tsconfig paths
import { hashAnswer, fetchQuestionsFromConfig, shuffleArray } from '@/services/trivia';
import { db } from '@top-x/shared';
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

  // Question management for fixed mode
  const allQuestions = ref<TriviaQuestion[]>([]);
  const questionQueue = ref<TriviaQuestionViewModel[]>([]);
  const currentBatchIndex = ref(0);

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
    correctAnswer: (legacy.correctAnswer as string | undefined) ?? '',
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

  if (!normalized.correctAnswer || !normalized.answers.some((answer: TriviaAnswer) => answer.text === normalized.correctAnswer)) {
    if (typeof legacy.correct === 'number' && legacy.correct >= 0 && legacy.correct < normalized.answers.length) {
      normalized.correctAnswer = normalized.answers[legacy.correct]?.text || normalized.answers[0].text;
    } else {
      normalized.correctAnswer = normalized.answers[0].text;
    }
  }

  return normalized;
}

  async function ensureConfig(): Promise<void> {
    if (configLoaded.value) {
      console.log('[Trivia] Config already loaded, skipping');
      return;
    }

    console.log('[Trivia] Loading config...');
    isLoading.value = true;
    try {
      const gameDoc = doc(db, 'games', activeGameId.value);
      const snapshot = await getDoc(gameDoc);
      if (snapshot.exists()) {
        const data = snapshot.data() as Game;
        if (data.custom && typeof data.custom === 'object') {
          baseConfig.value = data.custom as TriviaConfig;
          console.log('[Trivia] Config loaded from Firebase:', {
            mode: baseConfig.value.mode,
            questionsCount: baseConfig.value.questions?.length ?? 0,
            unlimitedLives: baseConfig.value.unlimitedLives,
          });
        }
      }

      if (!baseConfig.value) {
        console.warn('[Trivia] No config found, using defaults');
        baseConfig.value = { mode: 'fixed', questions: [], lives: DEFAULT_LIVES };
      }

      // Load questions from config
      loadQuestionsFromConfig();
      lives.value = unlimitedLives.value ? Infinity : (activeConfig.value?.lives ?? DEFAULT_LIVES);
      configLoaded.value = true;
      console.log('[Trivia] Config loaded successfully:', {
        totalQuestions: allQuestions.value.length,
        lives: lives.value,
        unlimitedLives: unlimitedLives.value,
      });
    } catch (error) {
      console.error('[Trivia] Failed to load trivia config', error);
      baseConfig.value = { mode: 'fixed', questions: [], lives: DEFAULT_LIVES };
      loadQuestionsFromConfig();
      lives.value = DEFAULT_LIVES;
      configLoaded.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  function loadQuestionsFromConfig(): void {
    const config = activeConfig.value;
    console.log('[Trivia] loadQuestionsFromConfig called:', {
      hasConfig: !!config,
      questionsCount: config?.questions?.length ?? 0,
      batchSize: config?.questionBatchSize ?? 0,
    });

    if (!config || !config.questions || config.questions.length === 0) {
      // Add fallback default question if no questions exist
      console.warn('[Trivia] No questions in config, adding default question');
      allQuestions.value = [createDefaultQuestion()];
      return;
    }

    const normalizedQuestions: TriviaQuestion[] = config.questions.map((question: TriviaQuestion | LegacyTriviaQuestion) =>
      normalizeQuestion(question)
    );

    const batchSize = config.questionBatchSize ?? 0;
    if (batchSize === 0) {
      allQuestions.value = [...normalizedQuestions];
      console.log('[Trivia] Loaded all questions:', allQuestions.value.length);
    } else {
      const batch = fetchQuestionsFromConfig({ ...config, questions: normalizedQuestions }, batchSize, []);
      allQuestions.value = [...batch];
      console.log('[Trivia] Loaded first batch:', batch.length, 'of', normalizedQuestions.length);
    }

    allQuestions.value.forEach((q: TriviaQuestion, idx: number) => {
      if (!q.answers || q.answers.length === 0) {
        console.error(`[Trivia] Question ${idx} (${q.id}) has no answers:`, q);
      }
      if (!q.text) {
        console.error(`[Trivia] Question ${idx} (${q.id}) has no text:`, q);
      }
    });
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

  async function loadNextBatch(): Promise<void> {
    const config = activeConfig.value;
    if (!config || !config.questions) {
      return;
    }

    const batchSize = config.questionBatchSize ?? 0;
    if (batchSize === 0) {
      // Already have all questions
      return;
    }

    // Get next batch
    const excludeIds = allQuestions.value.map((q: TriviaQuestion) => q.id);
    const nextBatch = fetchQuestionsFromConfig(config, batchSize, excludeIds);
    
    if (nextBatch.length > 0) {
      allQuestions.value.push(...nextBatch);
    }
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

    const shuffledOptions = shuffleArray([...next.options]);
    currentQuestion.value = {
      ...next,
      options: shuffledOptions,
    };

    questionOrder.value.push(next.id);
    selectedAnswer.value = null;
    isCorrect.value = null;
    startQuestionTimer(next);
    console.log('[Trivia] Question displayed successfully');
  }

  async function ensureQuestionsLoaded(): Promise<void> {
    const config = activeConfig.value;
    if (!config) {
      console.warn('No config available for loading questions');
      return;
    }

    // Get available questions (not yet answered)
    const availableQuestions = allQuestions.value.filter(
      (q: TriviaQuestion) => !answeredQuestionIds.value.includes(q.id)
    );

    console.log('[Trivia] ensureQuestionsLoaded:', {
      totalQuestions: allQuestions.value.length,
      availableQuestions: availableQuestions.length,
      queueLength: questionQueue.value.length,
      answeredCount: answeredQuestionIds.value.length,
    });

    // If queue is empty and we have available questions, add them
    if (questionQueue.value.length === 0 && availableQuestions.length > 0) {
      // Convert to view models and shuffle
      const viewModels = availableQuestions.map((q: TriviaQuestion) => {
        try {
          return toViewModel(q);
        } catch (error) {
          console.error('[Trivia] Error converting question to view model:', q, error);
          return null;
        }
      }).filter((vm: TriviaQuestionViewModel | null): vm is TriviaQuestionViewModel => vm !== null);
      
      if (viewModels.length > 0) {
        const shuffled = shuffleArray(viewModels);
        questionQueue.value.push(...shuffled);
        console.log('[Trivia] Loaded questions into queue:', shuffled.length);
      }
    }

    // Check if we need to load next batch
    const batchSize = config.questionBatchSize ?? 0;
    if (batchSize > 0 && availableQuestions.length === 0) {
      await loadNextBatch();
      const newAvailable = allQuestions.value.filter(
        (q: TriviaQuestion) => !answeredQuestionIds.value.includes(q.id)
      );
      if (newAvailable.length > 0) {
        const viewModels = newAvailable.map(toViewModel);
        const shuffled = shuffleArray(viewModels);
        questionQueue.value.push(...shuffled);
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

  async function recordAttempt(question: TriviaQuestionViewModel, answerIndex: number): Promise<string> {
    // Get the answer text from the option
    const option = question.options[answerIndex];
    const answerText = typeof option === 'string' ? option : option.text;
    
    const hash = await hashAnswer(question.id, answerText, question.salt);
    attempts.value.push({
      questionId: question.id,
      answerHash: hash,
      answeredAt: nowIso(),
    });
    answeredQuestionIds.value.push(question.id);
    return hash;
  }

  function applyIncorrectAnswer(): void {
    if (!unlimitedLives.value) {
      lives.value -= 1;
    }
    streak.value = 0;
    updateBestStreaks();
  }

  function applyCorrectAnswer(): void {
    streak.value += 1;
    updateBestStreaks();

    const basePoints = 100;
    const streakBonus = Math.max(0, streak.value - 1) * 10;
    score.value += basePoints + streakBonus;

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

    // Record timeout as incorrect
    const answerText = 'timeout';
    const hash = await hashAnswer(currentQuestion.value.id, answerText, currentQuestion.value.salt);
    attempts.value.push({
      questionId: currentQuestion.value.id,
      answerHash: hash,
      answeredAt: nowIso(),
    });
    answeredQuestionIds.value.push(currentQuestion.value.id);
    applyIncorrectAnswer();

    if (!unlimitedLives.value && lives.value <= 0) {
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

    selectedAnswer.value = index;
    const answerHash = await recordAttempt(currentQuestion.value, index);
    
    // Validate answer by comparing hash
    const option = currentQuestion.value.options[index];
    const answerText = typeof option === 'string' ? option : option.text;
    const expectedHash = currentQuestion.value.correctHash;
    const correct = expectedHash ? expectedHash === answerHash : false;
    
    console.log('[Trivia] Answer validation:', {
      answerText,
      answerHash,
      expectedHash,
      correct,
    });
    
    isCorrect.value = correct;

    if (correct) {
      console.log('[Trivia] Correct answer! Score:', score.value, 'Streak:', streak.value);
      applyCorrectAnswer();
    } else {
      console.log('[Trivia] Incorrect answer. Lives:', lives.value, 'Streak:', streak.value);
      applyIncorrectAnswer();
    }

    bestScore.value = Math.max(bestScore.value, score.value);

    if (!unlimitedLives.value && lives.value <= 0) {
      console.log('[Trivia] No lives left, ending game');
      endGame();
      return;
    }

    // Check if we've answered all questions
    const totalQuestions = activeConfig.value?.questions?.length ?? 0;
    console.log('[Trivia] Progress check:', {
      answered: answeredQuestionIds.value.length,
      total: totalQuestions,
      allQuestionsCount: allQuestions.value.length,
    });

    if (answeredQuestionIds.value.length >= totalQuestions && totalQuestions > 0) {
      console.log('[Trivia] All questions answered, ending game');
      endGame();
      return;
    }

    console.log('[Trivia] Preparing next question...');
    await prepareNextQuestion();
  }

  function resetGameState(): void {
    resetTimers();
    attempts.value = [];
    answeredQuestionIds.value = [];
    questionOrder.value = [];
    correctAttempts.value = 0;
    powerUps.value = [];
    streak.value = 0;
    sessionBestStreak.value = 0;
    selectedAnswer.value = null;
    isCorrect.value = null;
    score.value = 0;
    lives.value = unlimitedLives.value ? Infinity : (activeConfig.value?.lives ?? DEFAULT_LIVES);
    currentQuestion.value = null;
    questionQueue.value = [];
    currentBatchIndex.value = 0;
    questionTimerDuration.value = DEFAULT_QUESTION_TIMER;
    questionTimeLeft.value = DEFAULT_QUESTION_TIMER;
  }

  async function startGame(): Promise<void> {
    console.log('[Trivia] startGame called');
    await ensureConfig();
    resetGameState();
    
    console.log('[Trivia] After resetGameState:', {
      allQuestionsCount: allQuestions.value.length,
      queueLength: questionQueue.value.length,
    });
    
    // Ensure questions are loaded before starting
    if (allQuestions.value.length === 0) {
      console.log('[Trivia] No questions, reloading from config');
      loadQuestionsFromConfig();
    }
    
    // If still no questions, add default
    if (allQuestions.value.length === 0) {
      console.warn('[Trivia] Still no questions, adding default');
      allQuestions.value = [createDefaultQuestion()];
    }
    
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
          mode: 'fixed',
          lastScore: gameData.score,
          lastAttempts: attempts.value.length,
          lastCorrect: correctAttempts.value,
          lastQuestionIds: questionOrder.value,
          bestStreak: sessionBestStreak.value,
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
          mode: 'fixed',
          attemptCount: attempts.value.length,
          attempts: attempts.value,
          questionIds: questionOrder.value,
          answeredQuestionIds: answeredQuestionIds.value,
          correctCount: correctAttempts.value,
          bestStreak: sessionBestStreak.value,
          currentStreak: streak.value,
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
        photoURL: data.photoURL || 'https://www.top-x.co/assets/profile.png',
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
  const mode = computed(() => activeConfig.value?.mode ?? 'fixed');
  const language = computed(
    () => currentQuestion.value?.category ?? activeConfig.value?.language ?? 'en'
  );
  const showCorrectAnswers = computed(() => Boolean(activeConfig.value?.showCorrectAnswers && unlimitedLives.value));
  const configLives = computed(() => activeConfig.value?.lives ?? DEFAULT_LIVES);
  const theme = computed(() => ({
    primaryColor: activeConfig.value?.theme?.primaryColor ?? '#8C52FF',
    secondaryColor: activeConfig.value?.theme?.secondaryColor ?? '#FF9F1C',
    backgroundColor: activeConfig.value?.theme?.backgroundColor ?? '#0B0B0F',
    backgroundImageUrl: activeConfig.value?.theme?.backgroundImageUrl,
    backgroundVideoUrl: activeConfig.value?.theme?.backgroundVideoUrl,
    backgroundOverlayColor: activeConfig.value?.theme?.backgroundOverlayColor ?? 'rgba(0, 0, 0, 0.55)',
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
    return activeConfig.value?.questions?.length ?? null;
  });

  const dailyChallengeId = computed(() => activeDailyChallengeId.value);
  const gameId = computed(() => activeGameId.value);

  async function applyConfigOverride(
    config: TriviaConfig | null,
    options?: { dailyChallengeId?: string | null }
  ): Promise<void> {
    overrideConfig.value = config;
    activeDailyChallengeId.value = options?.dailyChallengeId ?? null;
    loadQuestionsFromConfig();
    lives.value = unlimitedLives.value ? Infinity : (activeConfig.value?.lives ?? DEFAULT_LIVES);
  }

  return {
    currentScreen,
    currentQuestion,
    selectedAnswer,
    isCorrect,
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
    timeLeft,
    questionTimerDuration,
    globalTimeLeft,
    attempts,
    attemptCount,
    correctAttemptCount,
    currentQuestionNumber,
    totalQuestions,
    mode,
    language,
    showCorrectAnswers,
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

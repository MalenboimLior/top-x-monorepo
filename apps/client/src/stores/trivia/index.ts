import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import type { Game } from '@top-x/shared/types/game';
import type { User, UserGameDataSubmission } from '@top-x/shared/types/user';
import {
  type TriviaConfig,
  type TriviaFixedConfig,
  type TriviaEndlessConfig,
  type TriviaModeController,
  type TriviaQuestionViewModel,
  type TriviaAttemptPayload,
  type PowerUpState,
} from './types';
import { nowIso, shuffleInPlace } from './utils';
import { createFixedModeController } from './modes/fixed';
import { createEndlessModeController } from './modes/endless';
import { fetchTriviaQuestions, fetchTriviaBatch } from '@/services/trivia';
import { db } from '@top-x/shared';
import { useUserStore } from '../user';
import { getTopLeaderboard } from '@/services/leaderboard';

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
const HASH_SECRET = 'top-x-trivia-secret';

function isEndlessConfig(config: TriviaConfig | null): config is TriviaEndlessConfig {
  return Boolean(config && config.mode === 'endless');
}

async function hashAnswerValue(question: TriviaQuestionViewModel, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const payload = `${question.id}|${value}|${question.salt ?? ''}`;
  const msgBuffer = encoder.encode(payload);
  const keyBuffer = encoder.encode(HASH_SECRET);
  const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hashBuffer = await crypto.subtle.sign('HMAC', key, msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const useTriviaStore = defineStore('trivia', () => {
  const userStore = useUserStore();

  const currentScreen = ref<'start' | 'playing' | 'gameover'>('start');
  const baseConfig = ref<TriviaConfig | null>(null);
  const overrideConfig = ref<TriviaConfig | null>(null);
  const configLoaded = ref(false);
  const activeDailyChallengeId = ref<string | null>(null);
  const modeController = ref<TriviaModeController | null>(null);

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

  const pendingScore = ref<number | null>(null);
  const pendingBestStreak = ref<number | null>(null);

  const activeConfig = computed(() => overrideConfig.value ?? baseConfig.value);

  async function ensureConfig(): Promise<void> {
    if (configLoaded.value) {
      return;
    }

    isLoading.value = true;
    try {
      const gameDoc = doc(db, 'games', GAME_ID);
      const snapshot = await getDoc(gameDoc);
      if (snapshot.exists()) {
        const data = snapshot.data() as Game;
        if (data.custom && typeof data.custom === 'object') {
          baseConfig.value = data.custom as TriviaConfig;
        }
      }

      if (!baseConfig.value) {
        baseConfig.value = { mode: 'fixed', questions: [], lives: DEFAULT_LIVES } as TriviaFixedConfig;
      }

      setupModeController();
      lives.value = activeConfig.value?.lives ?? DEFAULT_LIVES;
      configLoaded.value = true;
    } catch (error) {
      console.error('Failed to load trivia config', error);
      baseConfig.value = { mode: 'fixed', questions: [], lives: DEFAULT_LIVES } as TriviaFixedConfig;
      setupModeController();
      lives.value = DEFAULT_LIVES;
      configLoaded.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  function setupModeController(): void {
    const config = activeConfig.value;
    if (!config) {
      modeController.value = null;
      return;
    }

    if (isEndlessConfig(config)) {
      modeController.value = createEndlessModeController({
        config,
        fetchBatch: async (batchSize, cursor, excludeIds) => {
          const { questions, handle } = await fetchTriviaBatch({
            gameId: GAME_ID,
            batchSize,
            cursor,
            excludeIds,
          });
          return { questions, cursor: handle.cursor, hasMore: handle.hasMore };
        },
      });
    } else {
      const fixedConfig = config as TriviaFixedConfig;
      modeController.value = createFixedModeController({
        config: fixedConfig,
        fetchQuestions:
          fixedConfig.questionSource === 'inline'
            ? undefined
            : async (limit, excludeIds) =>
                fetchTriviaQuestions({ gameId: GAME_ID, limit, excludeIds }),
      });
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
    if (!activeConfig.value?.globalTimer?.enabled) {
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
    if (!modeController.value) {
      return;
    }

    await modeController.value.ensureQuestions();
    const next = modeController.value.nextQuestion();
    if (!next) {
      if (modeController.value.isComplete()) {
        endGame();
      }
      return;
    }

    const shuffledOptions = shuffleInPlace([...next.options]);
    currentQuestion.value = {
      ...next,
      options: shuffledOptions,
    };

    questionOrder.value.push(next.id);
    selectedAnswer.value = null;
    isCorrect.value = null;
    startQuestionTimer(next);
  }

  function spawnPowerUp(): void {
    if (!activeConfig.value?.powerUps?.length) {
      return;
    }

    const available = activeConfig.value.powerUps.filter((rule) => !powerUps.value.find((p) => p.id === rule.id));
    if (!available.length) {
      return;
    }

    const nextPowerUp = available[Math.floor(Math.random() * available.length)];
    powerUps.value.push({
      ...nextPowerUp,
      availableAt: Date.now(),
      uses: 0,
    });
  }

  async function recordAttempt(question: TriviaQuestionViewModel, answerValue: string): Promise<string> {
    const hash = await hashAnswerValue(question, answerValue);
    attempts.value.push({
      questionId: question.id,
      answerHash: hash,
      answeredAt: nowIso(),
    });
    answeredQuestionIds.value.push(question.id);
    return hash;
  }

  function applyIncorrectAnswer(): void {
    lives.value -= 1;
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

    if (activeConfig.value?.lives && streak.value > 0 && streak.value % 5 === 0) {
      lives.value = Math.min(activeConfig.value.lives, lives.value + 1);
    }

    spawnPowerUp();
  }

  async function handleTimeout(): Promise<void> {
    if (!currentQuestion.value) {
      return;
    }

    await recordAttempt(currentQuestion.value, 'timeout');
    modeController.value?.recordAnswer({ correct: false });
    applyIncorrectAnswer();

    if (lives.value <= 0) {
      endGame();
      return;
    }

    await prepareNextQuestion();
  }

  async function answerQuestion(index: number): Promise<void> {
    if (!currentQuestion.value || selectedAnswer.value !== null) {
      return;
    }

    if (questionTimerHandle.value) {
      clearInterval(questionTimerHandle.value);
      questionTimerHandle.value = null;
    }

    selectedAnswer.value = index;
    const answerHash = await recordAttempt(currentQuestion.value, index.toString());
    const expectedHash = currentQuestion.value.correctHash;
    const correct = expectedHash ? expectedHash === answerHash : false;
    isCorrect.value = correct;
    modeController.value?.recordAnswer({ correct });

    if (correct) {
      applyCorrectAnswer();
    } else {
      applyIncorrectAnswer();
    }

    bestScore.value = Math.max(bestScore.value, score.value);

    if (lives.value <= 0) {
      endGame();
      return;
    }

    if (modeController.value?.isComplete()) {
      endGame();
      return;
    }

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
    lives.value = activeConfig.value?.lives ?? DEFAULT_LIVES;
    currentQuestion.value = null;
    questionTimerDuration.value = DEFAULT_QUESTION_TIMER;
    questionTimeLeft.value = DEFAULT_QUESTION_TIMER;
  }

  async function startGame(): Promise<void> {
    await ensureConfig();
    if (!modeController.value) {
      return;
    }

    resetGameState();
    modeController.value.reset();
    currentScreen.value = 'playing';
    startGlobalTimer();
    await prepareNextQuestion();
  }

  function updateLocalProfile(gameData: UserGameDataSubmission): void {
    const profileValue = userStore.profile;
    if (!profileValue) {
      return;
    }

    const existingGameData = profileValue.games?.[GAME_TYPE_ID]?.[GAME_ID];
    const nextScore = Math.max(existingGameData?.score ?? 0, gameData.score);
    const nextStreak = Math.max(existingGameData?.streak ?? 0, gameData.streak);

    const existingGames = { ...(profileValue.games ?? {}) };
    const existingTypeGames = { ...(existingGames[GAME_TYPE_ID] ?? {}) };
    const existingTriviaCustom = (existingGameData?.custom?.trivia as Record<string, unknown> | undefined) ?? {};

    existingTypeGames[GAME_ID] = {
      score: nextScore,
      streak: nextStreak,
      lastPlayed: gameData.lastPlayed ?? Date.now(),
      custom: {
        ...(existingGameData?.custom ?? {}),
        trivia: {
          ...existingTriviaCustom,
          mode: activeConfig.value?.mode ?? 'fixed',
          lastScore: gameData.score,
          lastAttempts: attempts.value.length,
          lastCorrect: correctAttempts.value,
          lastQuestionIds: questionOrder.value,
          bestStreak: sessionBestStreak.value,
        },
      },
    };

    existingGames[GAME_TYPE_ID] = existingTypeGames;

    const updatedProfile: User = {
      ...profileValue,
      games: existingGames,
    };

    userStore.$patch({ profile: updatedProfile });
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
          mode: activeConfig.value?.mode ?? 'fixed',
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

    try {
      await userStore.updateGameProgress(GAME_TYPE_ID, GAME_ID, payload);
      updateLocalProfile(payload);
      await fetchLeaderboard();
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

  async function fetchLeaderboard(): Promise<void> {
    try {
      const challengeId = activeDailyChallengeId.value ?? undefined;
      const entries = await getTopLeaderboard('smartest_on_x', 10, challengeId);
      leaderboard.value = entries;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
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

  async function hashAnswer(index: number): Promise<string | null> {
    if (!currentQuestion.value) {
      return null;
    }
    return hashAnswerValue(currentQuestion.value, index.toString());
  }

  async function saveScoreAfterLogin(): Promise<void> {
    if (!userStore.user || pendingScore.value === null) {
      return;
    }
    await submitResults();
  }

  function resetGame(): void {
    resetGameState();
    currentScreen.value = 'start';
    inviter.value = null;
  }

  watch(
    () => userStore.profile,
    (profile) => {
      const stats = profile?.games?.[GAME_TYPE_ID]?.[GAME_ID];
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
    () => currentQuestion.value?.language ?? activeConfig.value?.language ?? 'en'
  );
  const showCorrectAnswers = computed(() => Boolean(activeConfig.value?.showCorrectAnswers));
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
  const questionsAnswered = computed(() => attempts.value.length);
  const currentQuestionNumber = computed(() => {
    if (!currentQuestion.value) {
      return attempts.value.length;
    }
    return attempts.value.length + 1;
  });
  const totalQuestions = computed(() => {
    if (!activeConfig.value || activeConfig.value.mode !== 'fixed') {
      return null;
    }
    if (
      typeof (activeConfig.value as TriviaFixedConfig | null)?.totalQuestions === 'number' &&
      (activeConfig.value as TriviaFixedConfig).totalQuestions !== undefined &&
      (activeConfig.value as TriviaFixedConfig).totalQuestions! > 0
    ) {
      return (activeConfig.value as TriviaFixedConfig).totalQuestions!;
    }
    if (activeConfig.value?.questions?.length) {
      return activeConfig.value.questions.length;
    }
    return null;
  });

  const dailyChallengeId = computed(() => activeDailyChallengeId.value);

  async function applyConfigOverride(
    config: TriviaConfig | null,
    options?: { dailyChallengeId?: string | null }
  ): Promise<void> {
    overrideConfig.value = config;
    activeDailyChallengeId.value = options?.dailyChallengeId ?? null;
    setupModeController();
    lives.value = activeConfig.value?.lives ?? DEFAULT_LIVES;
    await fetchLeaderboard();
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
    questionsAnswered,
    currentQuestionNumber,
    totalQuestions,
    mode,
    language,
    showCorrectAnswers,
    configLives,
    theme,
    dailyChallengeId,
    hashAnswer,
    loadInviter,
    startGame,
    answerQuestion,
    resetGame,
    saveScoreAfterLogin,
    applyConfigOverride,
  };
});

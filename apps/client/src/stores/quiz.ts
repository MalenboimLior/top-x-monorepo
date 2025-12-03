// apps/client/src/stores/quiz.ts

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { Game } from '@top-x/shared/types/game';
import type {
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  PersonalityBucket,
  PersonalityResultVariant,
  ArchetypeAxis,
  ArchetypeResult,
  QuizThemeConfig,
} from '@top-x/shared/types/quiz';
import {
  calculatePersonalityResult,
  calculateArchetypeResult,
  shuffleQuizQuestions,
  shuffleArray,
  type PersonalityScoreResult,
  type ArchetypeScoreResult,
} from '@top-x/shared/quiz/scoring';
import { useUserStore } from './user';

// =============================================================================
// Types
// =============================================================================

export type QuizScreen = 'start' | 'playing' | 'result';

export interface QuizQuestionViewModel {
  id: string;
  text: string;
  imageUrl?: string;
  answers: QuizAnswer[];
  category?: string;
}

interface InviterSnapshot {
  uid: string;
  displayName: string;
  photoURL: string;
}

// =============================================================================
// Store
// =============================================================================

export const useQuizStore = defineStore('quiz', () => {
  const userStore = useUserStore();

  // ---------------------------------------------------------------------------
  // Core State
  // ---------------------------------------------------------------------------

  const currentScreen = ref<QuizScreen>('start');
  const activeGameId = ref<string>('');
  const config = ref<QuizConfig | null>(null);
  const configLoaded = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // Question State
  // ---------------------------------------------------------------------------

  const questions = ref<QuizQuestionViewModel[]>([]);
  const currentQuestionIndex = ref(0);
  const selectedAnswers = ref<Record<string, number>>({});
  // Maps questionId -> shuffledIndex -> originalIndex for answer order mapping
  const answerIndexMappings = ref<Record<string, number[]>>({});

  // ---------------------------------------------------------------------------
  // Result State
  // ---------------------------------------------------------------------------

  const personalityResult = ref<PersonalityScoreResult | null>(null);
  const archetypeResult = ref<ArchetypeScoreResult | null>(null);

  // ---------------------------------------------------------------------------
  // Social
  // ---------------------------------------------------------------------------

  const inviter = ref<InviterSnapshot | null>(null);

  // ---------------------------------------------------------------------------
  // Computed Properties
  // ---------------------------------------------------------------------------

  const mode = computed(() => config.value?.mode ?? 'personality');
  
  const theme = computed<QuizThemeConfig>(() => ({
    primaryColor: config.value?.theme?.primaryColor ?? '#6366f1',
    secondaryColor: config.value?.theme?.secondaryColor ?? '#ec4899',
    backgroundColor: config.value?.theme?.backgroundColor ?? '#0f0f23',
    backgroundImageUrl: config.value?.theme?.backgroundImageUrl,
    backgroundVideoUrl: config.value?.theme?.backgroundVideoUrl,
    backgroundOverlayColor: config.value?.theme?.backgroundOverlayColor ?? 'rgba(0,0,0,0.7)',
  }));

  const language = computed(() => config.value?.language ?? 'en');
  const isRtl = computed(() => language.value === 'he' || language.value === 'il');
  const direction = computed(() => isRtl.value ? 'rtl' : 'ltr');

  const currentQuestion = computed<QuizQuestionViewModel | null>(() => {
    if (currentQuestionIndex.value >= questions.value.length) {
      return null;
    }
    return questions.value[currentQuestionIndex.value];
  });

  const totalQuestions = computed(() => questions.value.length);
  const currentQuestionNumber = computed(() => currentQuestionIndex.value + 1);
  const progress = computed(() => {
    if (totalQuestions.value === 0) return 0;
    return Math.round((currentQuestionIndex.value / totalQuestions.value) * 100);
  });

  const showProgress = computed(() => config.value?.showProgress ?? true);

  const isComplete = computed(() => {
    return currentQuestionIndex.value >= questions.value.length;
  });

  const personalityBuckets = computed<PersonalityBucket[]>(() => 
    config.value?.personalityBuckets ?? []
  );

  const archetypeAxes = computed<ArchetypeAxis[]>(() => 
    config.value?.archetypeAxes ?? []
  );

  const archetypeResults = computed<ArchetypeResult[]>(() => 
    config.value?.archetypeResults ?? []
  );

  // Get the final result based on mode
  const finalResult = computed(() => {
    if (mode.value === 'personality') {
      return personalityResult.value?.result ?? null;
    } else {
      return archetypeResult.value?.result ?? null;
    }
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function setGameId(gameId: string) {
    if (activeGameId.value !== gameId) {
      activeGameId.value = gameId;
      resetState();
    }
  }

  function resetState() {
    currentScreen.value = 'start';
    config.value = null;
    configLoaded.value = false;
    questions.value = [];
    currentQuestionIndex.value = 0;
    selectedAnswers.value = {};
    answerIndexMappings.value = {};
    personalityResult.value = null;
    archetypeResult.value = null;
    error.value = null;
  }

  async function loadConfig(): Promise<void> {
    if (!activeGameId.value) {
      error.value = 'No game ID specified';
      return;
    }

    if (configLoaded.value && config.value) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const gameRef = doc(db, 'games', activeGameId.value);
      const snapshot = await getDoc(gameRef);

      if (!snapshot.exists()) {
        error.value = 'Game not found';
        return;
      }

      const gameData = snapshot.data() as Game;
      
      // Check if game is active - if not, set error (game is not playable)
      if (!gameData.active) {
        error.value = 'Game is not active';
        isLoading.value = false;
        return;
      }
      
      console.log('[QuizStore] Game data loaded:', {
        gameId: activeGameId.value,
        gameTypeId: gameData.gameTypeId,
        hasCustom: !!gameData.custom,
        customType: typeof gameData.custom,
        customKeys: gameData.custom ? Object.keys(gameData.custom) : [],
      });
      
      console.log('[QuizStore] Full custom config:', JSON.stringify(gameData.custom, null, 2));
      
      // If gameTypeId is 'quiz', treat it as a quiz even if mode is wrong
      if (gameData.gameTypeId !== 'quiz') {
        error.value = 'Game is not a quiz type';
        return;
      }

      const rawConfig = gameData.custom as Record<string, unknown>;
      
      // Auto-fix mode if it's wrong but has quiz structure
      if (rawConfig.mode !== 'personality' && rawConfig.mode !== 'archetype') {
        // Check if it has personalityBuckets (personality quiz)
        if (Array.isArray(rawConfig.personalityBuckets) && rawConfig.personalityBuckets.length > 0) {
          console.warn('[QuizStore] Auto-fixing mode from', rawConfig.mode, 'to personality');
          rawConfig.mode = 'personality';
        }
        // Check if it has archetypeAxes (archetype quiz)
        else if (Array.isArray(rawConfig.archetypeAxes) && rawConfig.archetypeAxes.length > 0) {
          console.warn('[QuizStore] Auto-fixing mode from', rawConfig.mode, 'to archetype');
          rawConfig.mode = 'archetype';
        }
        else {
          console.error('[QuizStore] Cannot determine quiz mode:', {
            mode: rawConfig.mode,
            hasPersonalityBuckets: Array.isArray(rawConfig.personalityBuckets),
            hasArchetypeAxes: Array.isArray(rawConfig.archetypeAxes),
          });
          error.value = 'Invalid quiz configuration: missing mode or quiz structure';
          return;
        }
      }

      if (!isQuizConfig(rawConfig)) {
        console.error('[QuizStore] Config validation failed after mode fix:', {
          mode: rawConfig.mode,
          isObject: typeof rawConfig === 'object',
        });
        error.value = 'Invalid quiz configuration';
        return;
      }

      // Clean up Trivia-specific fields that shouldn't be in Quiz config
      const cleanedConfig: QuizConfig = {
        mode: rawConfig.mode as 'personality' | 'archetype',
        questions: Array.isArray(rawConfig.questions) ? rawConfig.questions : [],
        language: typeof rawConfig.language === 'string' ? rawConfig.language : undefined,
        theme: rawConfig.theme as QuizThemeConfig | undefined,
        personalityBuckets: Array.isArray(rawConfig.personalityBuckets) ? rawConfig.personalityBuckets : undefined,
        archetypeAxes: Array.isArray(rawConfig.archetypeAxes) ? rawConfig.archetypeAxes : undefined,
        archetypeResults: Array.isArray(rawConfig.archetypeResults) ? rawConfig.archetypeResults : undefined,
        showProgress: typeof rawConfig.showProgress === 'boolean' ? rawConfig.showProgress : undefined,
        shuffleQuestions: typeof rawConfig.shuffleQuestions === 'boolean' ? rawConfig.shuffleQuestions : undefined,
        shuffleAnswers: typeof rawConfig.shuffleAnswers === 'boolean' ? rawConfig.shuffleAnswers : undefined,
        mustLogin: typeof rawConfig.mustLogin === 'boolean' ? rawConfig.mustLogin : undefined,
        allowRepeats: typeof rawConfig.allowRepeats === 'boolean' ? rawConfig.allowRepeats : undefined,
      };

      console.log('[QuizStore] Valid quiz config:', {
        mode: cleanedConfig.mode,
        questionsCount: cleanedConfig.questions?.length ?? 0,
        personalityBucketsCount: cleanedConfig.personalityBuckets?.length ?? 0,
        archetypeAxesCount: cleanedConfig.archetypeAxes?.length ?? 0,
      });

      config.value = cleanedConfig;
      configLoaded.value = true;

      // Prepare questions
      prepareQuestions();

    } catch (err) {
      console.error('[QuizStore] Failed to load config:', err);
      console.error('[QuizStore] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        gameId: activeGameId.value,
      });
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      error.value = `Failed to load quiz configuration: ${errorMessage}`;
    } finally {
      isLoading.value = false;
    }
  }

  function isQuizConfig(custom: unknown): custom is QuizConfig {
    if (!custom || typeof custom !== 'object') return false;
    const c = custom as Record<string, unknown>;
    return c.mode === 'personality' || c.mode === 'archetype';
  }

  function prepareQuestions(): void {
    if (!config.value?.questions) {
      questions.value = [];
      answerIndexMappings.value = {};
      return;
    }

    // Store original questions for mapping reference
    const originalQuestions = config.value.questions;

    let preparedQuestions = config.value.questions.map((q) => ({
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      answers: q.answers,
      category: q.category,
    }));

    // Reset answer index mappings
    answerIndexMappings.value = {};

    // Shuffle if configured
    if (config.value.shuffleQuestions) {
      preparedQuestions = shuffleQuizQuestions(
        preparedQuestions as QuizQuestion[],
        config.value.shuffleAnswers ?? false
      );
      
      // Build answer index mappings for shuffled questions
      if (config.value.shuffleAnswers) {
        preparedQuestions.forEach((q) => {
          const originalQuestion = originalQuestions.find((oq) => oq.id === q.id);
          if (originalQuestion) {
            // Create mapping: shuffledIndex -> originalIndex
            // We do this by matching answers based on their content
            const mapping: number[] = [];
            q.answers.forEach((shuffledAnswer, shuffledIndex) => {
              // Find the original answer by matching content
              const originalIndex = originalQuestion.answers.findIndex((origAnswer) => {
                // Compare by text, imageUrl, and points
                return (
                  origAnswer.text === shuffledAnswer.text &&
                  origAnswer.imageUrl === shuffledAnswer.imageUrl &&
                  JSON.stringify(origAnswer.bucketPoints) === JSON.stringify(shuffledAnswer.bucketPoints) &&
                  JSON.stringify(origAnswer.axisPoints) === JSON.stringify(shuffledAnswer.axisPoints)
                );
              });
              if (originalIndex >= 0) {
                mapping[shuffledIndex] = originalIndex;
              }
            });
            answerIndexMappings.value[q.id] = mapping;
          }
        });
      }
    } else if (config.value.shuffleAnswers) {
      preparedQuestions = preparedQuestions.map((q) => {
        // Create array of indices [0, 1, 2, ...] and shuffle them using Fisher-Yates
        const indices = q.answers.map((_, idx) => idx);
        const shuffledIndices = shuffleArray(indices);
        
        // Create mapping: shuffledIndex -> originalIndex
        const mapping: number[] = [];
        shuffledIndices.forEach((originalIndex, shuffledIndex) => {
          mapping[shuffledIndex] = originalIndex;
        });
        answerIndexMappings.value[q.id] = mapping;
        
        // Shuffle answers using the shuffled indices
        const shuffledAnswers = shuffledIndices.map((idx) => q.answers[idx]);
        
        return {
          ...q,
          answers: shuffledAnswers,
        };
      });
    }

    questions.value = preparedQuestions;
  }

  async function startGame(): Promise<void> {
    isLoading.value = true;

    try {
      // Ensure config is loaded
      if (!configLoaded.value) {
        await loadConfig();
      }

      if (!config.value) {
        error.value = 'Failed to load quiz configuration';
        return;
      }

      // Reset game state
      currentQuestionIndex.value = 0;
      selectedAnswers.value = {};
      answerIndexMappings.value = {};
      personalityResult.value = null;
      archetypeResult.value = null;

      // Re-prepare questions (in case of replay with shuffle)
      prepareQuestions();

      currentScreen.value = 'playing';

    } finally {
      isLoading.value = false;
    }
  }

  function selectAnswer(answerIndex: number): void {
    const question = currentQuestion.value;
    if (!question) return;

    // Convert shuffled answer index to original index if answers were shuffled
    let originalIndex = answerIndex;
    const mapping = answerIndexMappings.value[question.id];
    if (mapping && mapping[answerIndex] !== undefined) {
      originalIndex = mapping[answerIndex];
    }

    // Record the answer using the original index (for scoring)
    selectedAnswers.value[question.id] = originalIndex;

    // Move to next question or calculate results
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++;
    } else {
      // Quiz complete - calculate results
      calculateResults();
      currentScreen.value = 'result';
    }
  }

  function calculateResults(): void {
    if (!config.value) return;

    if (mode.value === 'personality') {
      // Results are now embedded in buckets
      personalityResult.value = calculatePersonalityResult(
        selectedAnswers.value,
        config.value.questions,
        personalityBuckets.value
      );
    } else {
      archetypeResult.value = calculateArchetypeResult(
        selectedAnswers.value,
        config.value.questions,
        archetypeAxes.value,
        archetypeResults.value
      );
    }
  }

  function resetGame(): void {
    currentScreen.value = 'start';
    currentQuestionIndex.value = 0;
    selectedAnswers.value = {};
    answerIndexMappings.value = {};
    personalityResult.value = null;
    archetypeResult.value = null;
    
    // Re-prepare questions for fresh shuffle if needed
    if (config.value?.shuffleQuestions || config.value?.shuffleAnswers) {
      prepareQuestions();
    }
  }

  function goBack(): void {
    if (currentQuestionIndex.value > 0 && currentScreen.value === 'playing') {
      currentQuestionIndex.value--;
      // Remove the answer for the current question
      const question = currentQuestion.value;
      if (question) {
        delete selectedAnswers.value[question.id];
      }
    }
  }

  async function setInviter(uid: string): Promise<void> {
    if (!uid) {
      inviter.value = null;
      return;
    }

    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.data();
        inviter.value = {
          uid,
          displayName: userData.displayName ?? 'Anonymous',
          photoURL: userData.photoURL ?? '',
        };
      }
    } catch (err) {
      console.error('[QuizStore] Failed to load inviter:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Share Functionality
  // ---------------------------------------------------------------------------

  const shareUrl = computed(() => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.set('game', activeGameId.value);
    
    if (userStore.user?.uid) {
      params.set('inviter', userStore.user.uid);
    }

    return `${baseUrl}/games/quiz?${params.toString()}`;
  });

  const shareText = computed(() => {
    const result = finalResult.value;
    if (!result) return '';

    if (result.shareText) {
      return result.shareText;
    }

    return `I got "${result.title}"! Take the quiz and find out your result!`;
  });

  // ---------------------------------------------------------------------------
  // Return Store Interface
  // ---------------------------------------------------------------------------

  return {
    // State
    currentScreen,
    activeGameId,
    config,
    configLoaded,
    isLoading,
    error,
    questions,
    currentQuestionIndex,
    selectedAnswers,
    personalityResult,
    archetypeResult,
    inviter,

    // Computed
    mode,
    theme,
    language,
    isRtl,
    direction,
    currentQuestion,
    totalQuestions,
    currentQuestionNumber,
    progress,
    showProgress,
    isComplete,
    personalityBuckets,
    archetypeAxes,
    archetypeResults,
    finalResult,
    shareUrl,
    shareText,

    // Actions
    setGameId,
    resetState,
    loadConfig,
    startGame,
    selectAnswer,
    calculateResults,
    resetGame,
    goBack,
    setInviter,
  };
});


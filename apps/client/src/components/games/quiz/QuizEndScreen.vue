<template>
  <div class="quiz-end-screen">
    <Card class="result-card">
      <!-- Result Display -->
      <PersonalityResult
        v-if="mode === 'personality' && personalityResult"
        :result="personalityResult"
        :theme="theme"
      />
      
      <ArchetypeResult
        v-else-if="mode === 'archetype' && archetypeResult"
        :result="archetypeResult"
        :theme="theme"
      />

      <!-- Share Section -->
      <div class="share-section">
        <h3 class="share-title">Share Your Result</h3>
        <div class="share-buttons">
          <a
            :href="twitterShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="share-btn share-btn--twitter"
          >
            <span class="share-icon">𝕏</span>
            Share on X
          </a>
          <button
            type="button"
            class="share-btn share-btn--copy"
            @click="copyShareLink"
          >
            <span class="share-icon">📋</span>
            {{ copied ? 'Copied!' : 'Copy Link' }}
          </button>
        </div>
      </div>

      <!-- Inviter Challenge -->
      <div v-if="inviter" class="inviter-section">
        <img :src="inviter.photoURL" alt="" class="inviter-avatar" loading="lazy" />
        <p class="inviter-text">
          {{ t('games.quiz.sharedByStrong') }} <strong>{{ inviter.displayName }}</strong>
        </p>
      </div>

      <!-- Actions -->
      <div class="action-buttons">
        <CustomButton
          type="is-primary"
          :icon="['fas', 'redo']"
          label="Take Quiz Again"
          @click="playAgain"
        />
        <CustomButton
          v-if="!isLoggedIn"
          type="is-light"
          :icon="['fab', 'x-twitter']"
          label="Login to Save"
          @click="login"
        />
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import PersonalityResult from './PersonalityResult.vue';
import ArchetypeResult from './ArchetypeResult.vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import type { PersonalityScoreResult, ArchetypeScoreResult } from '@top-x/shared/quiz/scoring';
import type { QuizThemeConfig } from '@top-x/shared/types/quiz';

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

interface InviterDetails {
  displayName: string;
  photoURL: string;
}

interface Props {
  mode: 'personality' | 'archetype';
  isLoggedIn: boolean;
  personalityResult: PersonalityScoreResult | null;
  archetypeResult: ArchetypeScoreResult | null;
  theme: QuizThemeConfig;
  inviter: InviterDetails | null;
  shareUrl: string;
  shareText: string;
  gameId?: string;
  language: string;
  userImage: string;
}

const props = defineProps<Props>();
const userStore = useUserStore();

const emit = defineEmits<{
  (e: 'play-again'): void;
  (e: 'login'): void;
}>();

const copied = ref(false);

// Save quiz result when component mounts (if user is logged in)
onMounted(async () => {
  if (props.isLoggedIn && props.gameId && userStore.user) {
    await saveQuizResult();
  }
});

async function saveQuizResult() {
  if (!props.gameId || !userStore.user) {
    console.log('[QuizEndScreen] Cannot save quiz result - missing gameId or user', {
      gameId: props.gameId,
      hasUser: !!userStore.user,
    });
    return;
  }

  const custom: Record<string, unknown> = {};
  
  // Build quiz submission data
  const quizData: Record<string, unknown> = {
    mode: props.mode,
  };
  
  if (props.mode === 'personality' && props.personalityResult) {
    // Include full result data for backend processing
    custom.personalityResult = props.personalityResult;
    
    // Add selectedAnswers for leaderboard analytics
    quizData.selectedAnswers = props.personalityResult.selectedAnswers || {};
    quizData.personalityResult = {
      bucketId: props.personalityResult.bucketId,
      title: props.personalityResult.title,
    };
    
    console.log('[QuizEndScreen] Saving personality result:', {
      gameId: props.gameId,
      mode: props.mode,
      result: {
        bucketId: props.personalityResult.bucketId,
        title: props.personalityResult.title,
        points: props.personalityResult.points,
        selectedAnswersCount: Object.keys(props.personalityResult.selectedAnswers || {}).length,
      },
    });
  } else if (props.mode === 'archetype' && props.archetypeResult) {
    // Include full result data for backend processing
    custom.archetypeResult = props.archetypeResult;
    
    // Add selectedAnswers for leaderboard analytics
    quizData.selectedAnswers = props.archetypeResult.selectedAnswers || {};
    quizData.archetypeResult = {
      id: props.archetypeResult.id,
      title: props.archetypeResult.title,
      pattern: props.archetypeResult.pattern,
    };
    
    console.log('[QuizEndScreen] Saving archetype result:', {
      gameId: props.gameId,
      mode: props.mode,
      result: {
        id: props.archetypeResult.id,
        title: props.archetypeResult.title,
        pattern: props.archetypeResult.pattern,
        selectedAnswersCount: Object.keys(props.archetypeResult.selectedAnswers || {}).length,
      },
    });
  }
  
  // Add quiz data to custom
  custom.quiz = quizData;

  if (Object.keys(custom).length > 0) {
    try {
      console.log('[QuizEndScreen] Calling updateGameProgress with custom data:', {
        gameId: props.gameId,
        customKeys: Object.keys(custom),
        custom,
      });
      
      // Check what's currently in the profile before saving
      const currentGameData = userStore.profile?.games?.['quiz']?.[props.gameId];
      console.log('[QuizEndScreen] Current game data in profile before save:', {
        hasGameData: !!currentGameData,
        hasCustom: !!currentGameData?.custom,
        customKeys: currentGameData?.custom ? Object.keys(currentGameData.custom as Record<string, unknown>) : [],
        personalityResult: currentGameData?.custom ? (currentGameData.custom as Record<string, unknown>).personalityResult : undefined,
        archetypeResult: currentGameData?.custom ? (currentGameData.custom as Record<string, unknown>).archetypeResult : undefined,
      });

      await userStore.updateGameProgress('quiz', props.gameId, {
        score: 0, // Quiz doesn't use score
        streak: 0,
        custom,
      });
      
      console.log('[QuizEndScreen] updateGameProgress completed successfully');
    } catch (err) {
      console.error('[QuizEndScreen] Failed to save quiz result:', err);
    }
  } else {
    console.warn('[QuizEndScreen] No quiz result to save', {
      mode: props.mode,
      hasPersonalityResult: !!props.personalityResult,
      hasArchetypeResult: !!props.archetypeResult,
    });
  }
}

const twitterShareUrl = computed(() => {
  const text = encodeURIComponent(props.shareText);
  const url = encodeURIComponent(props.shareUrl);
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
});

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(props.shareUrl);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const playAgain = () => emit('play-again');
const login = () => emit('login');
</script>

<style scoped>
.quiz-end-screen {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.result-card {
  background: rgba(10, 12, 25, 0.9);
  border-radius: 24px;
  padding: 2rem;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Share Section */
.share-section {
  text-align: center;
}

.share-title {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.share-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.share-btn--twitter {
  background: #000;
  color: #fff;
}

.share-btn--twitter:hover {
  background: #1a1a1a;
  transform: translateY(-2px);
}

.share-btn--copy {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.share-btn--copy:hover {
  background: rgba(255, 255, 255, 0.12);
}

.share-icon {
  font-size: 1.1rem;
}

/* Inviter Section */
.inviter-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

.inviter-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.inviter-text {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.action-buttons > * {
  min-width: 200px;
}

@media (max-width: 768px) {
  .result-card {
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .share-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .share-btn {
    justify-content: center;
  }
}
</style>


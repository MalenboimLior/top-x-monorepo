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

  // Build quiz submission data
  const quizData: Record<string, unknown> = {
    mode: props.mode,
  };
  
  if (props.mode === 'personality' && props.personalityResult) {
    // Add selectedAnswers for leaderboard analytics
    quizData.selectedAnswers = props.personalityResult.selectedAnswers || {};
    quizData.personalityResult = {
      bucketId: props.personalityResult.bucketId,
      title: props.personalityResult.title,
      imageUrl: props.personalityResult.result?.imageUrl,
    };
    
    console.log('[QuizEndScreen] ===== PERSONALITY QUIZ SUBMISSION =====');
    console.log('[QuizEndScreen] Game ID:', props.gameId);
    console.log('[QuizEndScreen] Mode:', props.mode);
    console.log('[QuizEndScreen] Bucket ID:', props.personalityResult.bucketId);
    console.log('[QuizEndScreen] Title:', props.personalityResult.title);
    console.log('[QuizEndScreen] Points:', props.personalityResult.points);
    console.log('[QuizEndScreen] Selected Answers:', props.personalityResult.selectedAnswers);
    console.log('[QuizEndScreen] Selected Answers Count:', Object.keys(props.personalityResult.selectedAnswers || {}).length);
    console.log('[QuizEndScreen] =====================================');
  } else if (props.mode === 'archetype' && props.archetypeResult) {
    // Add selectedAnswers for leaderboard analytics
    quizData.selectedAnswers = props.archetypeResult.selectedAnswers || {};
    quizData.archetypeResult = {
      id: props.archetypeResult.id,
      title: props.archetypeResult.title,
      pattern: props.archetypeResult.pattern,
      imageUrl: props.archetypeResult.result?.imageUrl,
    };
    
    console.log('[QuizEndScreen] ===== ARCHETYPE QUIZ SUBMISSION =====');
    console.log('[QuizEndScreen] Game ID:', props.gameId);
    console.log('[QuizEndScreen] Mode:', props.mode);
    console.log('[QuizEndScreen] Result ID:', props.archetypeResult.id);
    console.log('[QuizEndScreen] Title:', props.archetypeResult.title);
    console.log('[QuizEndScreen] Pattern:', props.archetypeResult.pattern);
    console.log('[QuizEndScreen] Selected Answers:', props.archetypeResult.selectedAnswers);
    console.log('[QuizEndScreen] Selected Answers Count:', Object.keys(props.archetypeResult.selectedAnswers || {}).length);
    console.log('[QuizEndScreen] =====================================');
  }
  
  // Only send quiz data (not both quiz and personalityResult/archetypeResult)
  const custom: Record<string, unknown> = {
    quiz: quizData,
  };

  if (Object.keys(custom).length > 0) {
    try {
      console.log('[QuizEndScreen] ===== SENDING TO BACKEND =====');
      console.log('[QuizEndScreen] Custom data structure:', JSON.stringify(custom, null, 2));
      console.log('[QuizEndScreen] ==============================');
      
      // Check what's currently in the profile before saving
      const currentGameData = userStore.profile?.games?.['quiz']?.[props.gameId];
      console.log('[QuizEndScreen] Current game data in profile before save:', {
        hasGameData: !!currentGameData,
        hasCustom: !!currentGameData?.custom,
        customKeys: currentGameData?.custom ? Object.keys(currentGameData.custom as Record<string, unknown>) : [],
      });

      await userStore.updateGameProgress('quiz', props.gameId, {
        score: 0, // Quiz doesn't use score
        streak: 0,
        custom,
      });
      
      console.log('[QuizEndScreen] ===== SUBMISSION COMPLETE =====');
      console.log('[QuizEndScreen] Waiting for profile update...');
      
      // Wait a bit for the profile to update
      setTimeout(() => {
        const updatedGameData = userStore.profile?.games?.['quiz']?.[props.gameId];
        console.log('[QuizEndScreen] Profile after save:', {
          hasGameData: !!updatedGameData,
          hasCustom: !!updatedGameData?.custom,
          customKeys: updatedGameData?.custom ? Object.keys(updatedGameData.custom as Record<string, unknown>) : [],
          customData: updatedGameData?.custom,
        });
        console.log('[QuizEndScreen] ==================================');
      }, 2000);
    } catch (err) {
      console.error('[QuizEndScreen] ===== SUBMISSION FAILED =====');
      console.error('[QuizEndScreen] Error:', err);
      console.error('[QuizEndScreen] =============================');
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


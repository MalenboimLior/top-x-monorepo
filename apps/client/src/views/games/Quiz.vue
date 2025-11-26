<!-- Quiz game container - Personality & Archetype quizzes -->
<template>
  <div
    class="quiz-container"
    :class="{ 'is-rtl': isRtl }"
    :dir="direction"
    :style="themeStyles"
  >
    <video
      v-if="theme.backgroundVideoUrl"
      class="quiz-background-video"
      autoplay
      muted
      loop
      playsinline
    >
      <source :src="theme.backgroundVideoUrl" type="video/mp4" />
    </video>
    <div class="quiz-overlay" :style="overlayStyles"></div>

    <div class="quiz-content">
      <div v-if="error" class="notification is-danger">
        {{ error }}
      </div>

      <QuizScene
        v-if="currentScreen !== 'result'"
        :screen="currentScreen"
        :mode="mode"
        :current-question="currentQuestion"
        :question-number="currentQuestionNumber"
        :total-questions="totalQuestions"
        :progress="progress"
        :show-progress="showProgress"
        :is-loading="isLoading"
        :direction="direction"
        :inviter="inviter"
        :theme="theme"
        :language="language"
        @start-game="startGame"
        @select-answer="selectAnswer"
        @go-back="goBack"
      />

      <QuizEndScreen
        v-else
        :mode="mode"
        :is-logged-in="isLoggedIn"
        :personality-result="personalityResult"
        :archetype-result="archetypeResult"
        :theme="theme"
        :inviter="inviter"
        :share-url="shareUrl"
        :share-text="shareText"
        :language="language"
        :user-image="userImage"
        @play-again="resetGame"
        @login="login"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import QuizScene from '@/components/games/quiz/QuizScene.vue';
import QuizEndScreen from '@/components/games/quiz/QuizEndScreen.vue';
import { useQuizStore } from '@/stores/quiz';
import { useUserStore } from '@/stores/user';

const quizStore = useQuizStore();
const userStore = useUserStore();
const route = useRoute();

useHead({
  title: 'Quiz - TOP-X',
  meta: [
    { name: 'description', content: 'Take a personality or archetype quiz and discover your result!' },
  ],
});

// Game ID from route
const initialGameId = typeof route.query.game === 'string' && route.query.game.trim().length > 0
  ? route.query.game
  : '';

if (initialGameId) {
  quizStore.setGameId(initialGameId);
}

// Watch for game ID changes
watch(
  () => route.query.game,
  (nextGame) => {
    const normalized = typeof nextGame === 'string' && nextGame.trim().length > 0 ? nextGame : '';
    if (normalized && normalized !== quizStore.activeGameId) {
      quizStore.setGameId(normalized);
    }
  }
);

// Store state
const currentScreen = computed(() => quizStore.currentScreen);
const currentQuestion = computed(() => quizStore.currentQuestion);
const currentQuestionNumber = computed(() => quizStore.currentQuestionNumber);
const totalQuestions = computed(() => quizStore.totalQuestions);
const progress = computed(() => quizStore.progress);
const showProgress = computed(() => quizStore.showProgress);
const mode = computed(() => quizStore.mode);
const isLoading = computed(() => quizStore.isLoading);
const error = computed(() => quizStore.error);
const inviter = computed(() => quizStore.inviter);
const theme = computed(() => quizStore.theme);
const language = computed(() => quizStore.language);
const direction = computed(() => quizStore.direction);
const isRtl = computed(() => quizStore.isRtl);
const personalityResult = computed(() => quizStore.personalityResult);
const archetypeResult = computed(() => quizStore.archetypeResult);
const shareUrl = computed(() => quizStore.shareUrl);
const shareText = computed(() => quizStore.shareText);

// User state
const isLoggedIn = computed(() => !!userStore.user);
const userImage = computed(() => userStore.profile?.photoURL || 'https://via.placeholder.com/32');

// Theme styles
const themeStyles = computed(() => {
  const styles: Record<string, string> = {
    '--quiz-primary': theme.value.primaryColor ?? '#6366f1',
    '--quiz-secondary': theme.value.secondaryColor ?? '#ec4899',
    '--quiz-background': theme.value.backgroundColor ?? '#0f0f23',
  };
  styles.backgroundColor = theme.value.backgroundColor ?? '#0f0f23';
  styles['--quiz-background-image'] = theme.value.backgroundImageUrl
    ? `url(${theme.value.backgroundImageUrl})`
    : 'none';
  return styles;
});

const overlayStyles = computed(() => ({
  background: theme.value.backgroundOverlayColor ?? 'rgba(0,0,0,0.7)',
}));

// Actions
const startGame = () => {
  quizStore.startGame();
};

const selectAnswer = (index: number) => {
  quizStore.selectAnswer(index);
};

const goBack = () => {
  quizStore.goBack();
};

const resetGame = () => {
  quizStore.resetGame();
};

const login = async () => {
  await userStore.loginWithX();
};

// Load inviter if specified
onMounted(() => {
  const inviterUid = route.query.inviter as string;
  if (inviterUid) {
    quizStore.setInviter(inviterUid);
  }
});
</script>

<style scoped>
/* ============================================
   QUIZ COMPONENT - Flat Design
   ============================================ */

.quiz-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(var(--space-6), 4vw, var(--space-10));
  color: var(--color-text-primary);
  background-color: var(--quiz-background, var(--color-bg-primary));
  background-image: var(--quiz-background-image, none);
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.quiz-container.is-rtl {
  direction: rtl;
}

.quiz-background-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: var(--z-base);
  opacity: 0.35;
}

.quiz-overlay {
  position: absolute;
  inset: 0;
  background-color: var(--color-bg-overlay);
  z-index: var(--z-overlay);
}

.quiz-content {
  position: relative;
  z-index: var(--z-content);
  width: min(720px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.notification.is-danger,
.notification.is-info {
  border-radius: var(--radius-md);
}

.quiz-content .card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
}

.quiz-container.is-rtl .quiz-content {
  text-align: right;
}

@media (max-width: 768px) {
  .quiz-container {
    padding: var(--space-5);
  }

  .quiz-content {
    gap: var(--space-5);
  }
}
</style>


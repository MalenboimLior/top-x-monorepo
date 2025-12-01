<template>
  <div class="quiz-scene" :class="{ 'is-rtl': direction === 'rtl' }" :lang="language">
    <transition name="fade-slide" mode="out-in">
      <!-- Start Screen -->
      <section v-if="screen === 'start'" key="start" class="scene-section">
        <Card class="start-card">
          <header class="start-header">
            <h1 class="scene-title">{{ title }}</h1>
            <p class="scene-subtitle">{{ subtitle }}</p>
          </header>

          <div v-if="inviter" class="inviter-card">
            <img :src="inviter.photoURL" alt="Inviter avatar" class="inviter-avatar" loading="lazy" />
            <div class="inviter-details">
              <p class="inviter-label">Shared by {{ inviter.displayName }}</p>
              <p class="inviter-score">Take the quiz and share your result!</p>
            </div>
          </div>

          <!-- Saved Result Display -->
          <div v-if="savedResult" class="saved-result-section">
            <h3 class="saved-result-title">Your Previous Result</h3>
            <PersonalityResult
              v-if="savedResult.type === 'personality'"
              :result="savedResult.result as any"
              :theme="theme"
              :show-breakdown="false"
            />
            <ArchetypeResult
              v-else-if="savedResult.type === 'archetype'"
              :result="savedResult.result as any"
              :theme="theme"
            />
          </div>

          <div v-if="mustLogin && !isLoggedIn" class="login-section">
            <CustomButton
              class="start-button"
              type="is-primary"
              :icon="['fab', 'x-twitter']"
              :label="loginButtonLabel"
              :loading="isLoading"
              @click="handleLogin"
            />
            <p class="login-message">{{ loginRequiredMessage }}</p>
          </div>
          <div v-else-if="mustLogin && !allowRepeats && hasSubmitted" class="disabled-section">
            <CustomButton
              class="start-button"
              type="is-primary"
              :icon="['fas', 'play']"
              label="Start Quiz"
              :loading="isLoading"
              disabled
            />
            <p class="disabled-message">{{ alreadySubmittedMessage }}</p>
          </div>
          <CustomButton
            v-else
            class="start-button"
            type="is-primary"
            :icon="['fas', 'play']"
            label="Start Quiz"
            :loading="isLoading"
            @click="startRun"
          />
        </Card>
      </section>

      <!-- Playing Screen -->
      <section v-else key="playing" class="scene-section">
        <!-- Progress Header -->
        <div v-if="showProgress" class="quiz-progress">
          <div class="progress-info">
            <span class="progress-text">Question {{ questionNumber }} of {{ totalQuestions }}</span>
            <span class="progress-percent">{{ progress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading question...</p>
        </div>

        <!-- Question -->
        <QuizQuestion
          v-else-if="currentQuestion"
          :question="currentQuestion"
          :direction="direction"
          :can-go-back="questionNumber > 1"
          @select-answer="onSelectAnswer"
          @go-back="onGoBack"
        />
      </section>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import QuizQuestion from './QuizQuestion.vue';
import PersonalityResult from './PersonalityResult.vue';
import ArchetypeResult from './ArchetypeResult.vue';
import { useLocaleStore } from '@/stores/locale';
import type { QuizQuestionViewModel } from '@/stores/quiz';
import type { QuizThemeConfig } from '@top-x/shared/types/quiz';

interface InviterDetails {
  displayName: string;
  photoURL: string;
}

interface Props {
  screen: 'start' | 'playing';
  mode: 'personality' | 'archetype';
  currentQuestion: QuizQuestionViewModel | null;
  questionNumber: number;
  totalQuestions: number;
  progress: number;
  showProgress: boolean;
  isLoading: boolean;
  direction: 'ltr' | 'rtl';
  inviter: InviterDetails | null;
  theme: QuizThemeConfig;
  language: string;
  isLoggedIn: boolean;
  mustLogin: boolean;
  allowRepeats: boolean;
  hasSubmitted: boolean;
  savedResult?: { type: 'personality' | 'archetype'; result: unknown } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'start-game'): void;
  (e: 'select-answer', index: number): void;
  (e: 'go-back'): void;
  (e: 'login'): void;
}>();

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const title = computed(() => {
  return props.mode === 'personality' ? 'Personality Quiz' : 'Discover Your Type';
});

const subtitle = computed(() => {
  if (props.mode === 'personality') {
    return `Answer ${props.totalQuestions} questions to discover your result!`;
  }
  return `${props.totalQuestions} questions to reveal your archetype`;
});

const startRun = () => emit('start-game');
const handleLogin = () => emit('login');
const onSelectAnswer = (index: number) => emit('select-answer', index);
const onGoBack = () => emit('go-back');

const loginButtonLabel = computed(() => t('games.loginButton'));
const loginRequiredMessage = computed(() => t('games.loginRequired'));
const alreadySubmittedMessage = computed(() => t('games.alreadySubmitted'));
</script>

<style scoped>
.quiz-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.scene-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.scene-section > * {
  width: 600px;
  max-width: 600px;
  box-sizing: border-box;
}

/* Start Card */
.start-card {
  background: rgba(10, 12, 25, 0.85);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  text-align: center;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.scene-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  color: var(--color-text-primary);
  margin: 0;
  background: linear-gradient(135deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.scene-subtitle {
  color: var(--color-text-secondary);
  font-weight: 500;
  margin: 0.5rem 0 0;
  font-size: 1.1rem;
}

.inviter-card {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.inviter-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.inviter-details {
  text-align: start;
  color: #fff;
}

.inviter-label {
  font-weight: 600;
  margin: 0;
}

.inviter-score {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.start-button {
  align-self: center;
  min-width: 200px;
  margin-top: 0.5rem;
}

.login-section,
.disabled-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.login-message,
.disabled-message {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  text-align: center;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  width: 100%;
}

.disabled-message {
  color: rgba(255, 255, 255, 0.6);
}

/* Progress Bar */
.quiz-progress {
  background: rgba(10, 12, 25, 0.7);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  backdrop-filter: blur(8px);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.progress-text {
  font-size: 0.9rem;
}

.progress-percent {
  font-size: 0.85rem;
  color: var(--quiz-primary, #6366f1);
}

.progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--quiz-primary, #6366f1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* RTL Support */
.quiz-scene.is-rtl {
  direction: rtl;
}

.quiz-scene.is-rtl .inviter-details {
  text-align: end;
}

/* Saved Result Section */
.saved-result-section {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
}

.saved-result-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-secondary);
  margin: 0 0 1rem;
  text-align: center;
}

@media (max-width: 768px) {
  .scene-section > * {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
  }

  .start-card {
    padding: 2rem 1.5rem;
    gap: 1.5rem;
  }

  .scene-title {
    font-size: 1.75rem;
  }

  .scene-subtitle {
    font-size: 1rem;
  }

  .quiz-progress {
    padding: 0.85rem 1.25rem;
  }

  .progress-bar {
    height: 6px;
  }

  .saved-result-section {
    padding: 1.25rem;
  }
}
</style>


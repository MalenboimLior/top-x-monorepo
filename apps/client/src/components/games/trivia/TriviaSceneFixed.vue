<template>
  <div class="trivia-scene" :class="{ 'is-rtl': direction === 'rtl' }" :lang="language">
    <transition name="fade-slide" mode="out-in">
      <section v-if="screen === 'start'" key="start" class="scene-section">
        <Card class="start-card">
          <header class="start-header">
            <h1 class="scene-title">Trivia Takedown</h1>
            <p class="scene-subtitle">Fixed run · {{ totalQuestions || '∞' }} questions</p>
          </header>
          <div class="start-stats">
            <div class="stat">
              <span class="stat-label">Best Score</span>
              <span class="stat-value">{{ bestScore }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Best Streak</span>
              <span class="stat-value">{{ bestStreak }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Lives</span>
              <span class="stat-value">{{ totalLives }}</span>
            </div>
          </div>

          <div v-if="inviter" class="inviter-card">
            <img :src="inviter.photoURL" alt="Inviter avatar" class="inviter-avatar" />
            <div class="inviter-details">
              <p class="inviter-label">Challenge from {{ inviter.displayName }}</p>
              <p class="inviter-score">Score to beat: {{ inviter.score }}</p>
            </div>
          </div>

          <CustomButton
            class="start-button"
            type="is-primary"
            :icon="['fas', 'play']"
            label="Start run"
            @click="startRun"
          />
        </Card>
      </section>

      <section v-else key="playing" class="scene-section">
        <div class="scene-hud">
          <div class="hud-main">
            <div class="hud-group">
              <span class="hud-label">Score</span>
              <span class="hud-value">{{ score }}</span>
            </div>
            <div class="hud-group" :class="{ 'streak-glow': streakPulse }">
              <span class="hud-label">Streak</span>
              <span class="hud-value">{{ streak }}</span>
              <small class="hud-sub">Best {{ sessionBestStreak }}</small>
            </div>
            <div class="hud-group">
              <span class="hud-label">Lives</span>
              <div class="lives">
                <span v-for="(heart, index) in livesDisplay" :key="index" :class="{ lost: !heart }">❤️</span>
              </div>
            </div>
          </div>

          <div class="hud-progress">
            <div class="timer-wrapper" role="timer" aria-live="polite">
              <svg class="timer-circle" viewBox="0 0 120 120">
                <circle class="timer-circle-bg" cx="60" cy="60" r="54" />
                <circle
                  class="timer-circle-progress"
                  cx="60"
                  cy="60"
                  r="54"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="dashOffset"
                />
                <text x="50%" y="50%" dy="0.35em" text-anchor="middle">{{ timeLeft }}</text>
              </svg>
              <span class="timer-label">Question</span>
            </div>

            <div v-if="progressPercent !== null" class="question-progress">
              <div class="progress-label">
                <span>Progress</span>
                <span>{{ questionNumber }}/{{ totalQuestions }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
              </div>
            </div>

            <div v-if="globalTimeLeft !== null" class="global-timer">
              <div class="progress-label">
                <span>Session Timer</span>
                <span>{{ formattedGlobalTimer }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill is-warning" :style="{ width: `${globalTimerPercent}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <img src="/assets/loading.gif" alt="Loading" />
          <p>Fetching questions...</p>
        </div>

        <TriviaQuestion
          v-else
          :question="currentQuestion"
          :selected-answer="selectedAnswer"
          :is-correct="isCorrect"
          :correct-answer-index="correctAnswerIndex"
          :show-correct-answers="showCorrectAnswers"
          :direction="direction"
          @answer-question="onAnswer"
        />

        <div v-if="powerUps.length" class="power-ups">
          <h3 class="power-ups-title">Power-ups</h3>
          <ul class="power-ups-list">
            <li v-for="powerUp in powerUps" :key="powerUp.id" class="power-up-chip">
              <span class="chip-label">⚡ {{ powerUp.label }}</span>
              <small class="chip-meta">{{ powerUp.uses }}/{{ powerUp.maxUses ?? '∞' }} uses</small>
            </li>
          </ul>
        </div>
      </section>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import TriviaQuestion from './TriviaQuestion.vue';
import type { TriviaQuestionViewModel, PowerUpState } from '@/stores/trivia/types';

interface InviterDetails {
  displayName: string;
  photoURL: string;
  score: number;
}

interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
}

interface Props {
  screen: 'start' | 'playing';
  bestScore: number;
  bestStreak: number;
  score: number;
  streak: number;
  sessionBestStreak: number;
  lives: number;
  totalLives: number;
  currentQuestion: TriviaQuestionViewModel | null;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  correctAnswerIndex: number | null;
  timeLeft: number;
  questionTimerDuration: number;
  globalTimeLeft: number | null;
  powerUps: PowerUpState[];
  isLoading: boolean;
  questionNumber: number | null;
  totalQuestions: number | null;
  showCorrectAnswers: boolean;
  direction: 'ltr' | 'rtl';
  inviter: InviterDetails | null;
  theme: ThemeConfig;
  language: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'start-game'): void;
  (e: 'answer-question', index: number): void;
}>();

const circumference = 2 * Math.PI * 54;

const dashOffset = computed(() => {
  if (props.questionTimerDuration <= 0) {
    return 0;
  }
  const ratio = Math.max(0, props.timeLeft) / props.questionTimerDuration;
  return circumference * (1 - ratio);
});

const formattedGlobalTimer = computed(() => {
  if (props.globalTimeLeft === null) {
    return '';
  }
  const minutes = Math.floor(props.globalTimeLeft / 60);
  const seconds = props.globalTimeLeft % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const progressPercent = computed(() => {
  if (!props.totalQuestions || props.totalQuestions <= 0 || props.questionNumber === null) {
    return null;
  }
  const answered = Math.max(0, props.questionNumber - 1);
  return Math.min(100, Math.round((answered / props.totalQuestions) * 100));
});

const globalTimerStart = ref<number | null>(null);

watch(
  () => props.globalTimeLeft,
  (value) => {
    if (value === null) {
      globalTimerStart.value = null;
      return;
    }
    if (globalTimerStart.value === null || value > globalTimerStart.value) {
      globalTimerStart.value = value;
    }
  },
  { immediate: true }
);

const globalTimerPercent = computed(() => {
  if (props.globalTimeLeft === null || !globalTimerStart.value) {
    return 0;
  }
  return Math.max(0, Math.round((props.globalTimeLeft / globalTimerStart.value) * 100));
});

const livesDisplay = computed(() => {
  const hearts: boolean[] = [];
  for (let i = 0; i < props.totalLives; i++) {
    hearts.push(i < props.lives);
  }
  return hearts;
});

const streakPulse = ref(false);

watch(
  () => props.streak,
  (newStreak, oldStreak) => {
    if (newStreak > oldStreak) {
      streakPulse.value = true;
      setTimeout(() => {
        streakPulse.value = false;
      }, 500);
    }
  }
);

const startRun = () => emit('start-game');

const onAnswer = (index: number) => {
  emit('answer-question', index);
};
</script>

<style scoped>
.trivia-scene {
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
}

.start-card {
  background: rgba(10, 12, 25, 0.8);
  border-radius: 18px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  text-align: center;
}

.scene-title {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  color: #fff;
  margin: 0;
}

.scene-subtitle {
  color: rgba(255, 255, 255, 0.65);
  font-weight: 500;
  margin: 0.25rem 0 0;
}

.start-stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 0.85rem 1.25rem;
  min-width: 120px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #fff;
}

.inviter-card {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.95rem 1.2rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
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
  color: rgba(255, 255, 255, 0.75);
}

.start-button {
  align-self: center;
  min-width: 200px;
}

.scene-hud {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: rgba(10, 12, 25, 0.75);
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.25);
}

.hud-main {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.hud-group {
  flex: 1;
  min-width: 140px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 0.9rem 1.1rem;
  color: #fff;
  position: relative;
}

.hud-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
}

.hud-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.hud-sub {
  display: block;
  color: rgba(255, 255, 255, 0.55);
}

.lives {
  display: flex;
  gap: 0.35rem;
  font-size: 1.35rem;
}

.lives .lost {
  opacity: 0.35;
}

.hud-progress {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: space-between;
  color: #fff;
}

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.timer-circle {
  width: 120px;
  height: 120px;
}

.timer-circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 8;
}

.timer-circle-progress {
  fill: none;
  stroke: var(--trivia-secondary, #ff9f1c);
  stroke-width: 8;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.35s ease;
}

.timer-label {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.question-progress,
.global-timer {
  flex: 1;
  min-width: 220px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--trivia-primary, #8c52ff);
  transition: width 0.3s ease;
}

.progress-bar-fill.is-warning {
  background: var(--trivia-secondary, #ff9f1c);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
}

.loading-state img {
  width: 80px;
  height: 80px;
}

.power-ups {
  background: rgba(10, 12, 25, 0.6);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  color: #fff;
}

.power-ups-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.power-ups-list {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0;
}

.power-up-chip {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.chip-label {
  font-weight: 600;
}

.chip-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.streak-glow {
  animation: streakPulse 0.5s ease;
}

@keyframes streakPulse {
  0% {
    box-shadow: 0 0 0 rgba(140, 82, 255, 0.6);
  }
  100% {
    box-shadow: 0 0 35px rgba(140, 82, 255, 0);
  }
}

@media (max-width: 768px) {
  .scene-hud {
    padding: 1.25rem;
  }

  .hud-main {
    flex-direction: column;
  }
}
</style>

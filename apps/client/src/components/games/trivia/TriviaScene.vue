<template>
  <div class="trivia-scene" :class="{ 'is-rtl': direction === 'rtl' }" :lang="language">
    <transition name="fade-slide" mode="out-in">
      <section v-if="screen === 'start'" key="start" class="scene-section">
        <Card class="start-card">
          <header class="start-header">
            <h1 class="scene-title">{{ title }}</h1>
            <p class="scene-subtitle">{{ subtitle }}</p>
          </header>
          <div class="start-stats">
            <div class="stat">
              <span class="stat-label">{{ t('games.trivia.bestScore') }}</span>
              <span class="stat-value">{{ bestScore }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">{{ t('games.trivia.bestStreak') }}</span>
              <span class="stat-value">{{ bestStreak }}</span>
            </div>
            <div v-if="!unlimitedLives" class="stat">
              <span class="stat-label">{{ t('games.trivia.lives') }}</span>
              <span class="stat-value">{{ totalLives }}</span>
            </div>
          </div>

          <div v-if="inviter" class="inviter-card">
            <img :src="inviter.photoURL" alt="Inviter avatar" class="inviter-avatar" loading="lazy" />
            <div class="inviter-details">
              <p class="inviter-label">{{ inviterText }}</p>
              <p class="inviter-score">{{ inviterScoreText }}</p>
            </div>
          </div>

          <div v-if="mustLogin && !isLoggedIn" class="login-section">
            <CustomButton
              class="start-button"
              type="is-primary"
              :icon="['fab', 'x-twitter']"
              :label="loginButtonLabel"
              @click="handleLogin"
            />
            <p class="login-message">{{ loginRequiredMessage }}</p>
          </div>
          <div v-else-if="mustLogin && !allowRepeats && hasSubmitted" class="disabled-section">
            <CustomButton
              class="start-button"
              type="is-primary"
              :icon="startButtonIcon"
              :label="startButtonLabel"
              disabled
            />
            <p class="disabled-message">{{ alreadySubmittedMessage }}</p>
          </div>
          <CustomButton
            v-else
            class="start-button"
            type="is-primary"
            :icon="startButtonIcon"
            :label="startButtonLabel"
            @click="startRun"
          />

          <!-- Optional Leaderboard Section -->
          <div v-if="showLeaderboard && gameId" class="leaderboard-section">
            <button class="leaderboard-toggle" @click="toggleLeaderboard">
              <font-awesome-icon :icon="['fas', 'trophy']" class="toggle-icon" />
              <span>{{ isLeaderboardExpanded ? t('games.trivia.hideLeaderboard') : t('games.trivia.viewLeaderboard') }}</span>
              <font-awesome-icon
                :icon="['fas', isLeaderboardExpanded ? 'chevron-up' : 'chevron-down']"
                class="toggle-chevron"
              />
            </button>
            
            <!-- Expanded: Full leaderboard with tabs (lazy loaded) -->
            <div v-if="isLeaderboardExpanded" class="leaderboard-expanded">
              <Leaderboard
                :game-id="gameId"
                :current-user-id="userId"
                :frenemies="frenemies"
                :daily-challenge-id="dailyChallengeId"
                default-view="top"
                :show-date-range="true"
                :limit="10"
                @add-frenemy="handleAddFrenemy"
              />
            </div>
            
            <!-- Collapsed: Show minimal preview (top 5 only) -->
            <div v-else class="leaderboard-preview-wrapper">
              <LeaderboardPreview
                :game-id="gameId"
                :current-user-id="userId"
                :daily-challenge-id="dailyChallengeId"
                :limit="5"
              />
            </div>
          </div>
        </Card>
      </section>

      <section v-else key="playing" class="scene-section">
        <div class="scene-hud">
          <div class="hud-main">
            <div class="hud-group hud-group--compact">
              <span class="hud-label">{{ t('games.trivia.score') }}</span>
              <span class="hud-value">{{ score }}</span>
            </div>
            <div
              class="hud-group hud-group--compact bonus-anchor"
              :class="{ 'streak-glow': streakPulse }"
            >
              <span class="hud-label">{{ t('games.trivia.streak') }}</span>
              <span class="hud-value">{{ streak }}</span>
              <small class="hud-sub">Best {{ sessionBestStreak }}</small>
              <transition name="bonus-pop">
                <span
                  v-if="showStreakBonus && streakBonusValue !== null"
                  :key="streakBonusKey"
                  class="bonus-chip bonus-chip--streak"
                >
                  +{{ streakBonusValue }}
                </span>
              </transition>
            </div>
            <div v-if="!unlimitedLives" class="hud-group lives-group">
              <span class="hud-label">{{ t('games.trivia.lives') }}</span>
              <div class="lives">
                <span v-for="(heart, index) in livesDisplay" :key="index" :class="{ lost: !heart }">❤️</span>
              </div>
            </div>
          </div>

          <div v-if="showProgress" class="hud-progress">
            <div
              v-if="!unlimitedLives || progressPercent !== null"
              class="progress-track"
            >
              <div
                v-if="!unlimitedLives"
                class="timer-wrapper bonus-anchor"
                role="timer"
                aria-live="polite"
              >
                <svg class="timer-circle" viewBox="0 0 120 120">
                  <circle class="timer-circle-start" cx="60" cy="6" r="6" :fill="timerStrokeColor" />
                  <circle class="timer-circle-bg" cx="60" cy="60" r="54" />
                  <circle
                    class="timer-circle-progress"
                    cx="60"
                    cy="60"
                    r="54"
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="dashOffset"
                    :style="{ stroke: timerStrokeColor }"
                    stroke-linecap="round"
                  />
                  <text x="50%" y="50%" dy="0.35em" text-anchor="middle">{{ timeLeft }}</text>
                </svg>
                <transition name="bonus-pop">
                  <span
                    v-if="showSpeedBonus && speedBonusValue !== null"
                    :key="speedBonusKey"
                    class="bonus-chip bonus-chip--timer"
                  >
                    +{{ speedBonusValue }}
                  </span>
                </transition>
              </div>
              <div
                v-if="progressPercent !== null && progressDisplayNumber !== null"
                class="question-progress"
                :style="{ '--progress-start-color': progressAccentColor }"
              >
                <div class="progress-label">
                  <span>{{ t('games.trivia.progress') }}</span>
                  <span>{{ progressDisplayNumber }}/{{ totalQuestions }}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" :style="progressFillStyle"></div>
                </div>
              </div>
            </div>

            <div v-if="globalTimeLeft !== null" class="global-timer">
              <div class="progress-label">
                <span>{{ t('games.trivia.sessionTimer') }}</span>
                <span>{{ formattedGlobalTimer }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill is-warning" :style="{ width: `${globalTimerPercent}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <img src="/assets/loading.gif" alt="Loading" loading="lazy" />
          <p>{{ t('games.trivia.fetchingQuestions') }}</p>
        </div>

        <div class="question-wrapper" v-else>
          <transition name="fade-slide" mode="out-in">
            <TriviaQuestion
              v-if="currentQuestion"
              :key="currentQuestion.id"
              :question="currentQuestion"
              :selected-answer="selectedAnswer"
              :is-correct="isCorrect"
              :correct-answer-index="correctAnswerIndex"
              :is-reviewing-answer="isReviewingAnswer"
              :show-correct-answers="showCorrectAnswers"
              :direction="direction"
              @answer-question="onAnswer"
            />
          </transition>
        </div>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import TriviaQuestion from './TriviaQuestion.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import LeaderboardPreview from '@/components/LeaderboardPreview.vue';
import { useLocaleStore } from '@/stores/locale';
import type { TriviaQuestionViewModel, PowerUpState } from '@/stores/trivia/types';

interface InviterDetails {
  displayName: string;
  photoURL: string;
  score: number;
}

interface Props {
  screen: 'start' | 'playing';
  mode: 'fixed' | 'endless';
  bestScore: number;
  bestStreak: number;
  score: number;
  streak: number;
  sessionBestStreak: number;
  lives: number;
  totalLives: number;
  unlimitedLives: boolean;
  currentQuestion: TriviaQuestionViewModel | null;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  correctAnswerIndex: number | null;
  isReviewingAnswer: boolean;
  timeLeft: number;
  questionTimerDuration: number;
  globalTimeLeft: number | null;
  powerUps: PowerUpState[];
  isLoading: boolean;
  questionNumber: number | null;
  totalQuestions: number | null;
  showCorrectAnswers: boolean;
  showProgress: boolean;
  direction: 'ltr' | 'rtl';
  inviter: InviterDetails | null;
  theme: Record<string, string | undefined>;
  language: string;
  lastSpeedBonus: number;
  lastStreakBonus: number;
  isLoggedIn: boolean;
  mustLogin: boolean;
  allowRepeats: boolean;
  hasSubmitted: boolean;
  // New props for leaderboard
  gameId?: string;
  userId?: string;
  frenemies?: string[];
  showLeaderboard?: boolean;
  dailyChallengeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  gameId: undefined,
  userId: undefined,
  frenemies: () => [],
  showLeaderboard: true,
  dailyChallengeId: undefined,
});

const emit = defineEmits<{
  (e: 'start-game'): void;
  (e: 'answer-question', index: number): void;
  (e: 'login'): void;
  (e: 'add-frenemy', uid: string): void;
}>();

// Leaderboard expand state (collapsed by default to avoid fetch)
const isLeaderboardExpanded = ref(false);

const toggleLeaderboard = () => {
  isLeaderboardExpanded.value = !isLeaderboardExpanded.value;
};

const handleAddFrenemy = (uid: string) => {
  emit('add-frenemy', uid);
};

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const circumference = 2 * Math.PI * 54;

const dashOffset = computed(() => {
  if (props.questionTimerDuration <= 0) {
    return 0;
  }
  const ratio = Math.max(0, props.timeLeft) / props.questionTimerDuration;
  return circumference * (1 - ratio);
});

const timerStrokeColor = computed(() => {
  if (props.questionTimerDuration <= 0) {
    return '#4ade80';
  }
  const ratio = Math.max(0, Math.min(1, props.timeLeft / props.questionTimerDuration));

  if (ratio <= 0.15) {
    return '#ff4d4f';
  }
  if (ratio <= 0.35) {
    return '#ff9f1c';
  }
  return '#4ade80';
});

const formattedGlobalTimer = computed(() => {
  if (props.globalTimeLeft === null) {
    return '';
  }
  const minutes = Math.floor(props.globalTimeLeft / 60);
  const seconds = props.globalTimeLeft % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const answeredQuestions = computed(() => {
  if (!props.totalQuestions || props.totalQuestions <= 0) {
    return 0;
  }
  const questionNumber = props.questionNumber ?? 0;
  const hasCurrentQuestion = Boolean(props.currentQuestion);
  const answered = Math.max(0, questionNumber - (hasCurrentQuestion ? 1 : 0));
  return Math.min(answered, props.totalQuestions);
});

const progressDisplayNumber = computed(() => {
  if (!props.totalQuestions || props.totalQuestions <= 0) {
    return null;
  }

  if (answeredQuestions.value >= props.totalQuestions) {
    return props.totalQuestions;
  }

  return Math.min(props.totalQuestions, answeredQuestions.value + 1);
});

const progressPercent = computed(() => {
  if (!props.totalQuestions || props.totalQuestions <= 0) {
    return null;
  }

  const answered = answeredQuestions.value;

  if (props.isReviewingAnswer && answered >= props.totalQuestions) {
    return 100;
  }

  if (answered <= 0) {
    return 0;
  }

  const percent = (answered / props.totalQuestions) * 100;
  return Math.min(100, Math.round(percent));
});

const progressAccentColor = computed(() => {
  if (progressPercent.value === null) {
    return '#8c52ff';
  }

  const ratio = progressPercent.value / 100;

  if (ratio >= 0.85) {
    return '#4ade80';
  }
  if (ratio >= 0.6) {
    return '#8c52ff';
  }
  if (ratio >= 0.3) {
    return '#ff9f1c';
  }
  return '#38bdf8';
});

const progressFillStyle = computed(() => {
  if (progressPercent.value === null) {
    return {};
  }

  const accent = progressAccentColor.value;
  const glowColor = accent.startsWith('#') ? `${accent}40` : 'rgba(140, 82, 255, 0.35)';

  return {
    width: `${progressPercent.value}%`,
    background: `linear-gradient(90deg, ${accent} 0%, rgba(140, 82, 255, 0.92) 65%, rgba(255, 159, 28, 0.95) 100%)`,
    boxShadow: `0 0 18px ${glowColor}`,
  };
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

const BONUS_DISPLAY_DURATION = 1400;
const streakBonusValue = ref<number | null>(null);
const showStreakBonus = ref(false);
const streakBonusKey = ref(0);
let streakBonusTimeout: ReturnType<typeof setTimeout> | null = null;

const speedBonusValue = ref<number | null>(null);
const showSpeedBonus = ref(false);
const speedBonusKey = ref(0);
let speedBonusTimeout: ReturnType<typeof setTimeout> | null = null;

const clearStreakTimeout = () => {
  if (streakBonusTimeout) {
    clearTimeout(streakBonusTimeout);
    streakBonusTimeout = null;
  }
};

const clearSpeedTimeout = () => {
  if (speedBonusTimeout) {
    clearTimeout(speedBonusTimeout);
    speedBonusTimeout = null;
  }
};

const hideStreakBonus = () => {
  clearStreakTimeout();
  showStreakBonus.value = false;
  streakBonusValue.value = null;
};

const hideSpeedBonus = () => {
  clearSpeedTimeout();
  showSpeedBonus.value = false;
  speedBonusValue.value = null;
};

const triggerStreakBonus = (value: number) => {
  streakBonusValue.value = value;
  streakBonusKey.value += 1;
  showStreakBonus.value = true;
  clearStreakTimeout();
  streakBonusTimeout = setTimeout(() => {
    showStreakBonus.value = false;
    streakBonusTimeout = null;
  }, BONUS_DISPLAY_DURATION);
};

const triggerSpeedBonus = (value: number) => {
  speedBonusValue.value = value;
  speedBonusKey.value += 1;
  showSpeedBonus.value = true;
  clearSpeedTimeout();
  speedBonusTimeout = setTimeout(() => {
    showSpeedBonus.value = false;
    speedBonusTimeout = null;
  }, BONUS_DISPLAY_DURATION);
};

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

watch(
  () => [props.lastStreakBonus, props.streak, props.screen] as const,
  ([bonus, , screen]) => {
    if (screen !== 'playing') {
      hideStreakBonus();
      return;
    }
    if (bonus > 0) {
      triggerStreakBonus(bonus);
    } else if (bonus === 0) {
      hideStreakBonus();
    }
  }
);

watch(
  () =>
    [props.lastSpeedBonus, props.score, props.unlimitedLives, props.screen] as const,
  ([bonus, , unlimited, screen]) => {
    if (screen !== 'playing' || unlimited) {
      hideSpeedBonus();
      return;
    }
    if (bonus > 0) {
      triggerSpeedBonus(bonus);
    } else if (bonus === 0) {
      hideSpeedBonus();
    }
  }
);

onBeforeUnmount(() => {
  hideStreakBonus();
  hideSpeedBonus();
});

const title = computed(() => {
  return props.mode === 'endless' ? 'Endless Trivia Blitz' : 'Trivia Takedown';
});

const subtitle = computed(() => {
  if (props.mode === 'endless') {
    return 'Stay alive, climb the streak, conquer the feed.';
  }
  return `Fixed run · ${props.totalQuestions || '∞'} questions`;
});

const inviterText = computed(() => {
  if (props.mode === 'endless') {
    return `${props.inviter?.displayName} dropped a ${props.inviter?.score}.`;
  }
  return `Challenge from ${props.inviter?.displayName}`;
});

const inviterScoreText = computed(() => {
  if (props.mode === 'endless') {
    return t('games.trivia.beatAndFlex');
  }
  return `${t('games.trivia.scoreToBeat')}: ${props.inviter?.score}`;
});

const startButtonIcon = computed(() => {
  return props.mode === 'endless' ? ['fas', 'bolt'] : ['fas', 'play'];
});

const startButtonLabel = computed(() => {
  return props.mode === 'endless' ? 'Start endless run' : 'Start run';
});

const startRun = () => emit('start-game');
const handleLogin = () => emit('login');

const onAnswer = (index: number) => emit('answer-question', index);

const loginButtonLabel = computed(() => t('games.loginButton'));
const loginRequiredMessage = computed(() => t('games.loginRequired'));
const alreadySubmittedMessage = computed(() => t('games.alreadySubmitted'));
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
  align-items: center;
}

.scene-section > * {
  width: 720px;
  max-width: 720px;
  box-sizing: border-box;
}

.start-card,
.scene-hud,
.power-ups {
  width: 720px;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
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
  color: var(--color-text-primary);
  margin: 0;
}

.scene-subtitle {
  color: var(--color-text-secondary);
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
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: 14px;
  padding: 0.85rem 1.25rem;
  min-width: 120px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text-primary);
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
  margin-top: 1rem;
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

/* Leaderboard Section */
.leaderboard-section {
  margin-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 1rem;
}

.leaderboard-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.leaderboard-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
}

.toggle-icon {
  color: var(--color-primary, #8c52ff);
}

.toggle-chevron {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.6;
}

.leaderboard-expanded {
  margin-top: 1rem;
}

.leaderboard-preview-wrapper {
  margin-top: 0.75rem;
}

.scene-hud {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: rgba(10, 12, 25, 0.75);
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.25);
  direction: ltr;
  text-align: left;
}

.hud-main {
  display: flex;
  gap: 1.1rem;
  flex-wrap: nowrap;
  align-items: stretch;
}

.hud-group {
  flex: 1 1 0;
  min-width: 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  color: #fff;
  position: relative;
  backdrop-filter: blur(6px);
}

.hud-group--compact {
  flex: 0.85 1 0;
}

.bonus-anchor {
  position: relative;
}

.bonus-chip {
  position: absolute;
  top: -0.35rem;
  right: -0.25rem;
  background: rgba(255, 223, 94, 0.95);
  color: #0b0b0f;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  box-shadow: 0 12px 24px rgba(255, 190, 92, 0.35);
  pointer-events: none;
  white-space: nowrap;
  transform-origin: center;
}

.bonus-chip--timer {
  left: 50%;
  right: auto;
  top: -0.75rem;
  transform: translate(-50%, 0);
}

.bonus-pop-enter-active,
.bonus-pop-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.bonus-pop-enter-from,
.bonus-pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

.bonus-pop-enter-to {
  transform: translateY(0) scale(1);
}

.hud-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
}

.hud-value {
  font-size: 1.4rem;
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
  white-space: nowrap;
}

.lives .lost {
  opacity: 0.35;
}

.lives-group {
  flex: 1.35 1 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
}

.hud-progress {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  color: #fff;
}

.progress-track {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: nowrap;
}

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.timer-circle-start {
  filter: drop-shadow(0 0 12px rgba(0, 0, 0, 0.35));
}

.progress-track .question-progress {
  flex: 1 1 auto;
  min-width: 0;
}

.timer-circle {
  width: 72px;
  height: 72px;
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
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background: var(--trivia-primary, #8c52ff);
  transition: width 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}

.progress-bar-fill.is-warning {
  background: var(--trivia-secondary, #ff9f1c);
}

.progress-bar::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--progress-start-color, var(--trivia-primary, #8c52ff));
  top: 50%;
  left: 0;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 14px rgba(0, 0, 0, 0.35);
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
  width: 100%;
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
  .scene-section > * {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
  }

  .start-card,
  .scene-hud,
  .power-ups {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
  }

  .scene-hud {
    padding: 1rem 1.1rem;
    gap: 1rem;
  }

  .hud-main {
    gap: 0.55rem;
  }

  .hud-group {
    padding: 0.65rem 0.7rem;
    border-radius: 12px;
  }

  .hud-label {
    font-size: 0.65rem;
    letter-spacing: 0.08em;
  }

  .hud-value {
    font-size: 1.2rem;
  }

  .hud-group--compact .hud-value {
    font-size: 1.05rem;
  }

  .hud-sub {
    font-size: 0.65rem;
  }

  .lives {
    font-size: 1.1rem;
    gap: 0.25rem;
  }

  .lives-group {
    flex: 1.4 1 0;
    gap: 0.2rem;
  }

  .hud-progress {
    gap: 0.75rem;
  }

  .progress-track {
    gap: 0.6rem;
  }

  .timer-wrapper {
    flex: 0 0 auto;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
  }

  .timer-circle {
    width: 66px;
    height: 66px;
  }

  .bonus-chip {
    top: -0.2rem;
    right: -0.15rem;
    font-size: 0.75rem;
    padding: 0.1rem 0.35rem;
  }

  .bonus-chip--timer {
    top: -0.55rem;
  }

  .question-progress,
  .global-timer {
    flex: 1 0 150px;
    min-width: 0;
  }

  .progress-label {
    font-size: 0.75rem;
  }

  .progress-bar {
    height: 6px;
  }
}
</style>


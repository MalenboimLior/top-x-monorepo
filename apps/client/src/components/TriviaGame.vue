<!-- Core gameplay component for trivia -->
<template>
  <div class="gameplay-screen">
    <div v-if="isLoading" class="loading animate-item" style="--animation-delay: 0s;">
      <img src="/assets/loading.gif" alt="Loading..." class="loading-gif" />
      <p class="has-text-white">Loading questions...</p>
    </div>
    <div v-else>
      <div class="lives animate-item" style="--animation-delay: 0s;">
        <span v-for="i in 3" :key="i" :class="{ 'is-lost': i > lives }">❤️</span>
      </div>
      <div v-if="globalTimeLeft !== null" class="global-timer animate-item" style="--animation-delay: 0.1s;">
        ⏱️ Global Time: {{ formattedGlobalTimer }}
      </div>
      <div class="timer-bar animate-item" style="--animation-delay: 0.2s;">
        <span v-for="(item, index) in timerItems" :key="index" class="progress-char" :class="{ 'filled': item.isFilled }" :style="{ '--char-delay': `${index * 0.1}s` }">
          {{ item.char }}
        </span>
      </div>
      <TriviaQuestion
        class="animate-item"
        style="--animation-delay: 0.4s;"
        :current-question="currentQuestion"
        :selected-answer="selectedAnswer"
        :is-correct="isCorrect"
        :correct-answer-index="correctAnswerIndex"
        @answer-question="answerQuestion"
      />
      <div v-if="powerUps.length" class="power-up-list animate-item" style="--animation-delay: 0.6s;">
        <span v-for="powerUp in powerUps" :key="powerUp.id" class="tag is-info">
          ⚡ {{ powerUp.label }} ({{ powerUp.uses }}/{{ powerUp.maxUses ?? '∞' }})
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue';
import TriviaQuestion from '@/components/TriviaQuestion.vue';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctHash: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  group: string;
}

interface PowerUpDisplay {
  id: string;
  label: string;
  uses: number;
  maxUses?: number;
  availableAt: number;
  cooldownSeconds?: number;
}

interface Props {
  lives: number;
  timeLeft: number;
  questionTimerDuration: number;
  globalTimeLeft: number | null;
  currentQuestion: Question | null;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  correctAnswerIndex: number | null;
  isLoading: boolean;
  powerUps: PowerUpDisplay[];
}

const props = withDefaults(defineProps<Props>(), {
  lives: 3,
  timeLeft: 10,
  questionTimerDuration: 10,
  globalTimeLeft: null,
  currentQuestion: null,
  selectedAnswer: null,
  isCorrect: null,
  correctAnswerIndex: null,
  isLoading: false,
  powerUps: () => [],
});

const emit = defineEmits<{
  (e: 'answer-question', index: number): void;
}>();

const timerItems = computed(() => {
  const total = Math.max(props.questionTimerDuration, 1);
  const filled = Math.min(total, Math.max(0, Math.round(props.timeLeft)));
  const empty = Math.max(0, total - filled);
  const items = [];
  for (let i = 0; i < filled; i++) {
    items.push({ char: '■', isFilled: true });
  }
  for (let i = 0; i < empty; i++) {
    items.push({ char: '□', isFilled: false });
  }
  return items;
});

const formattedGlobalTimer = computed(() => {
  if (props.globalTimeLeft === null) {
    return '';
  }
  const minutes = Math.floor(props.globalTimeLeft / 60);
  const seconds = props.globalTimeLeft % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const isAnimated = ref(false);

watch(
  () => props.timeLeft,
  () => {
    isAnimated.value = false;
    setTimeout(() => {
      isAnimated.value = true;
    }, 50);
    console.log('Time left updated:', props.timeLeft);
  }
);

watch(
  () => props.currentQuestion,
  (newValue) => {
    console.log('Current question in TriviaGame:', newValue);
  },
  { immediate: true }
);

const answerQuestion = (index: number) => {
  emit('answer-question', index);
};
</script>

<style scoped>
.gameplay-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lives {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.lives span {
  margin: 0 0.2rem;
}

.lives .is-lost {
  opacity: 0.3;
}

.timer-bar {
  font-size: 1.2rem;
  margin: 0.5rem 0;
  text-align: center;
}

.global-timer {
  font-size: 1rem;
  margin-bottom: 0.25rem;
  color: #fff;
}

.progress-char {
  display: inline-block;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.progress-char.filled {
  animation: progress-fill 0.3s ease forwards;
  animation-delay: var(--char-delay);
}

@keyframes progress-fill {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-item {
  opacity: 0;
  transform: translateY(20px);
  animation: fade-slide 0.5s ease forwards;
  animation-delay: var(--animation-delay);
}

@keyframes fade-slide {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading {
  text-align: center;
}

.loading-gif {
}

.power-up-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
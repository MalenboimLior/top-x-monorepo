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
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, ref, onMounted } from 'vue';
import TriviaQuestion from '@/components/TriviaQuestion.vue';

interface Props {
  lives: number;
  timeLeft: number;
  currentQuestion: any;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  correctAnswerIndex: number | null;
  isLoading: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  lives: 3,
  timeLeft: 10,
  currentQuestion: null,
  selectedAnswer: null,
  isCorrect: null,
  correctAnswerIndex: null,
  isLoading: false,
});

const emit = defineEmits<{
  (e: 'answer-question', index: number): void;
}>();

// Timer items for ■□ display
const timerItems = computed(() => {
  const filled = Math.round(props.timeLeft); // timeLeft is 0 to 10
  const empty = 10 - filled;
  const items = [];
  for (let i = 0; i < filled; i++) {
    items.push({ char: '■', isFilled: true });
  }
  for (let i = 0; i < empty; i++) {
    items.push({ char: '□', isFilled: false });
  }
  return items;
});

// Animation control
const isAnimated = ref(false);

onMounted(() => {
  isAnimated.value = true;
  console.log('TriviaGame mounted, currentQuestion:', props.currentQuestion);
});

watch(
  () => props.timeLeft,
  (newValue) => {
    isAnimated.value = false;
    setTimeout(() => {
      isAnimated.value = true;
    }, 50); // Brief delay to reset animation
    console.log('Time left updated:', newValue);
  }
);

// Debug: Log currentQuestion to ensure it's being passed
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

/* Progress bar character animation */
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

/* General item animation */
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
</style>
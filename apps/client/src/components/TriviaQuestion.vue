<template>
  <transition name="question-slide" mode="out-in">
    <Card v-if="currentQuestion" :key="currentQuestion.id" class="question-card">
      <h2 class="question has-text-white animate-item" style="--animation-delay: 0s;">{{ currentQuestion.question }}</h2>
      <div class="columns is-mobile is-multiline animate-item" style="--animation-delay: 0.2s;">
        <div v-for="(option, index) in currentQuestion.options" :key="index" class="column is-half">
          <CustomButton
            class="is-fullwidth"
            :type="getButtonType(index)"
            :label="option"
            @click="answerQuestion(index)"
            :disabled="selectedAnswer !== null"
          />
        </div>
      </div>
    </Card>
    <div v-else class="has-text-white animate-item" style="--animation-delay: 0s;">No question available. Please start a new game.</div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Card from '@/components/Card.vue';
import CustomButton from '@/components/CustomButton.vue';

interface Props {
  currentQuestion: any;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  correctAnswerIndex: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  currentQuestion: null,
  selectedAnswer: null,
  isCorrect: null,
  correctAnswerIndex: null,
});

const emit = defineEmits<{
  (e: 'answer-question', index: number): void;
}>();

const answerQuestion = (index: number) => {
  emit('answer-question', index);
};

const getButtonType = (index: number) => {
  if (props.selectedAnswer === null) return 'is-light';
  if (props.selectedAnswer === index && props.isCorrect) return 'is-success correct-animation';
  if (props.selectedAnswer === index && !props.isCorrect) return 'is-danger incorrect-animation';
  if (index === props.correctAnswerIndex) return 'is-info';
  return 'is-light';
};

// Animation control
const isAnimated = ref(false);

onMounted(() => {
  isAnimated.value = true;
  console.log('TriviaQuestion mounted, currentQuestion:', props.currentQuestion);
});

watch(
  () => props.currentQuestion?.id,
  (newValue) => {
    isAnimated.value = false;
    setTimeout(() => {
      isAnimated.value = true;
    }, 50); // Brief delay to reset animation
    console.log('Current question ID in TriviaQuestion:', newValue);
  }
);
</script>

<style scoped>
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

/* Transition for question card */
.question-slide-enter-active,
.question-slide-leave-active {
  transition: all 0.3s ease;
}

.question-slide-enter-from,
.question-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.question-card {
  transition: all 0.3s ease;
}
</style>
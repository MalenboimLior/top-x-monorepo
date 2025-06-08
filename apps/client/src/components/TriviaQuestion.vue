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
import { ref, watch } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';


interface Question {
  id: string;
  question: string;
  options: string[];
  correctHash: string;
  difficulty: number;
  group: string;
}

interface Props {
  currentQuestion: Question | null;
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

const isAnimated = ref(false);

watch(
  () => props.currentQuestion?.id,
  () => {
    isAnimated.value = false;
    setTimeout(() => {
      isAnimated.value = true;
    }, 10);
    console.log('Current question ID in TriviaQuestion:', props.currentQuestion?.id);
  }
);
</script>

<style scoped>
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
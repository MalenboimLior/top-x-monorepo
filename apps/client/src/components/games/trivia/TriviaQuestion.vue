<template>
  <Card v-if="question" class="trivia-question-card" :class="{ 'has-media': hasQuestionImage, 'is-rtl': direction === 'rtl' }" :dir="direction">
    <div class="question-header">
      <div class="question-text">
        <h2 class="question-title">{{ question.question }}</h2>
        <span v-if="question.difficulty" class="question-difficulty">{{ question.difficulty }}</span>
      </div>
      <div v-if="hasQuestionImage" class="question-media">
        <img :src="question.media?.imageUrl" alt="Question illustration" />
      </div>
    </div>

    <div class="question-options" :class="{ 'is-rtl': direction === 'rtl' }">
      <button
        v-for="(option, index) in optionItems"
        :key="option.key"
        class="option-button"
        :class="optionClass(index)"
        :disabled="disabled"
        type="button"
        @click="answer(index)"
      >
        <div class="option-content">
          <div v-if="option.imageUrl" class="option-image">
            <img :src="option.imageUrl" :alt="`Option ${index + 1}`" />
          </div>
          <span class="option-label">{{ option.label }}</span>
          <span v-if="getOptionFeedbackIcon(index)" class="option-feedback">
            <span class="feedback-icon">{{ getOptionFeedbackIcon(index) }}</span>
          </span>
        </div>
        <div class="option-right">
          <span class="option-index">{{ optionIndexLabel(index) }}</span>
        </div>
      </button>
    </div>
  </Card>
  <div v-else class="question-empty">No question available.</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import type { TriviaQuestionViewModel } from '@/stores/trivia/types';

interface OptionItem {
  label: string;
  imageUrl?: string;
  key: string;
}

interface Props {
  question: TriviaQuestionViewModel | null;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  correctAnswerIndex: number | null;
  showCorrectAnswers?: boolean;
  direction?: 'ltr' | 'rtl';
  disabled?: boolean;
  isReviewingAnswer?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  question: null,
  selectedAnswer: null,
  isCorrect: null,
  correctAnswerIndex: null,
  showCorrectAnswers: false,
  direction: 'ltr',
  disabled: false,
  isReviewingAnswer: false,
});

const emit = defineEmits<{
  (e: 'answer-question', index: number): void;
}>();

const hasQuestionImage = computed(() => Boolean(props.question?.media?.imageUrl));

const optionItems = computed<OptionItem[]>(() => {
  if (!props.question?.options) {
    return [];
  }
  return props.question.options.map((option, index) => {
    if (typeof option === 'string') {
      return {
        label: option,
        key: `${props.question?.id ?? 'q'}-${index}`,
      };
    }
    if (typeof option === 'object' && option !== null) {
      const record = option as Record<string, unknown>;
      const label = (record.label as string) ?? (record.text as string) ?? `Option ${index + 1}`;
      const image =
        (record.imageUrl as string | undefined) ??
        (record.image_url as string | undefined) ??
        (record.image as string | undefined);
      return {
        label,
        imageUrl: image,
        key: `${props.question?.id ?? 'q'}-${index}`,
      };
    }
    return {
      label: `Option ${index + 1}`,
      key: `${props.question?.id ?? 'q'}-${index}`,
    };
  });
});

const disabled = computed(() => props.disabled || props.selectedAnswer !== null);

const showFeedback = computed(() => {
  // Show feedback when we have both a selected answer and know the correct answer
  // (We always show feedback for the selected answer, but only reveal correct answer when showCorrectAnswers is enabled)
  return props.selectedAnswer !== null && props.correctAnswerIndex !== null;
});

const optionClass = (index: number) => {
  const isSelected = props.selectedAnswer === index;
  const correctIndexMatch = props.correctAnswerIndex === index;
  const hasAnswer = props.selectedAnswer !== null;
  
  const classes: Record<string, boolean> = {
    'is-selected': isSelected,
    // Always show correct/incorrect styling for selected answers
    // For non-selected correct answers, only show when showCorrectAnswers is enabled
    'is-correct': hasAnswer && correctIndexMatch && (isSelected || props.showCorrectAnswers),
    'is-incorrect': hasAnswer && isSelected && !correctIndexMatch && props.correctAnswerIndex !== null,
  };
  return classes;
};

const getOptionFeedback = (index: number): string => {
  if (!showFeedback.value) {
    return '';
  }
  
  const isSelected = props.selectedAnswer === index;
  const isCorrect = props.correctAnswerIndex === index;
  
  // Always show feedback for selected answers
  if (isSelected && isCorrect) {
    return 'Correct!';
  }
  if (isSelected && !isCorrect) {
    return 'Wrong';
  }
  // Only show correct answer indicator for non-selected options when showCorrectAnswers is enabled
  if (!isSelected && isCorrect && props.selectedAnswer !== null && props.showCorrectAnswers) {
    return 'Correct Answer';
  }
  
  return '';
};

const getOptionFeedbackIcon = (index: number): string => {
  if (!showFeedback.value) {
    return '';
  }
  
  const isSelected = props.selectedAnswer === index;
  const isCorrect = props.correctAnswerIndex === index;
  
  // Always show feedback icons for selected answers
  if (isSelected && isCorrect) {
    return '✅';
  }
  if (isSelected && !isCorrect) {
    return '❌';
  }
  // Only show correct answer icon for non-selected options when showCorrectAnswers is enabled
  if (!isSelected && isCorrect && props.selectedAnswer !== null && props.showCorrectAnswers) {
    return '✓';
  }
  
  return '';
};

const optionIndexLabel = (index: number) => String.fromCharCode(65 + index);

const answer = (index: number) => {
  if (disabled.value) {
    return;
  }
  emit('answer-question', index);
};
</script>

<style scoped>
.trivia-question-card {
  background: rgba(12, 16, 31, 0.72);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
  width: 720px;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
}

.question-header {
  display: flex;
  gap: 1.25rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.question-text {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(140, 82, 255, 0.16), rgba(56, 189, 248, 0.18));
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
}

.question-prompt {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.35rem;
}

.question-title {
  font-size: clamp(1.55rem, 3.2vw, 2.15rem);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.28;
  margin: 0;
  letter-spacing: 0.01em;
}

.question-difficulty {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.question-media {
  max-width: 160px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
}

.question-media img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

.question-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  position: relative;
  overflow: visible;
}

.trivia-question-card.is-rtl {
  direction: rtl;
  text-align: right;
}

.trivia-question-card.is-rtl .question-header {
  flex-direction: row-reverse;
}

.trivia-question-card.is-rtl .question-text {
  text-align: right;
}

.trivia-question-card.is-rtl .question-title {
  text-align: right;
}

.question-options.is-rtl {
  direction: rtl;
}

.question-options.is-rtl .option-button {
  flex-direction: row-reverse;
  direction: rtl;
}

.question-options.is-rtl .option-content {
  text-align: right;
  direction: rtl;
  flex-direction: row;
}

.question-options.is-rtl .option-label {
  text-align: right;
  direction: rtl;
}


.question-options.is-rtl .option-right {
  align-items: flex-start;
  direction: ltr;
}

.question-options.is-rtl .option-feedback {
  left: 50%;
  transform: translateX(-50%);
}

.option-button {
  background: rgba(18, 22, 38, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s ease, border 0.2s ease, box-shadow 0.2s ease;
  color: #fff;
  position: relative;
  min-height: 60px;
  overflow: visible;
}

.option-button:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--trivia-secondary, #ff9f1c);
  box-shadow: 0 12px 25px rgba(255, 159, 28, 0.2);
}

.option-button:disabled {
  cursor: not-allowed;
  opacity: 0.85;
}

.option-button.is-selected {
  border-color: var(--trivia-primary, #8c52ff);
  box-shadow: 0 12px 30px rgba(140, 82, 255, 0.3);
}

.option-button.is-correct {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
}

.option-button.is-incorrect {
  border-color: #f87171;
  background: rgba(248, 113, 113, 0.12);
  box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.2);
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  text-align: start;
  position: relative;
}

.option-image {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.option-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.option-label {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
}

.option-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 0.25rem;
  flex-shrink: 0;
  min-width: 40px;
}

.option-feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  pointer-events: none;
}

.option-button.is-correct .option-feedback {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.option-button.is-incorrect .option-feedback {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.option-button.is-correct:not(.is-selected) .option-feedback {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.feedback-icon {
  font-size: 1.1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-index {
  font-weight: 700;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1;
  flex-shrink: 0;
}

.question-empty {
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  padding: 2rem 1rem;
}

@media (max-width: 768px) {
  .trivia-question-card {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    padding: 1.25rem;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .question-text {
    width: 100%;
    padding: 0.65rem 0.85rem;
  }

  .question-title {
    font-size: clamp(1.4rem, 5vw, 1.75rem);
  }

  .question-media {
    max-width: 100%;
    width: 100%;
  }

  .trivia-question-card.is-rtl .question-header {
    flex-direction: column;
  }

  .option-button {
    padding: 0.75rem 0.85rem;
    min-height: 56px;
  }

  .question-options.is-rtl .option-button {
    flex-direction: row-reverse;
  }

  .option-right {
    gap: 0.2rem;
    min-width: 36px;
  }

  .option-feedback {
    padding: 0.3rem;
    width: 1.75rem;
    height: 1.75rem;
  }

  .feedback-icon {
    font-size: 1rem;
  }

  .option-index {
    font-size: 1rem;
  }
}
</style>

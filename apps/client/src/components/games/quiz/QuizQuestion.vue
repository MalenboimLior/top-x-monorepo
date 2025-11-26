<template>
  <div class="quiz-question" :class="{ 'is-rtl': direction === 'rtl' }">
    <Card class="question-card">
      <!-- Question Header -->
      <div class="question-header">
        <button
          v-if="canGoBack"
          type="button"
          class="back-button"
          @click="goBack"
          aria-label="Go back"
        >
          <span class="back-icon">←</span>
        </button>
        <h2 class="question-text">{{ question.text }}</h2>
      </div>

      <!-- Question Image -->
      <div v-if="question.imageUrl" class="question-image-wrapper">
        <img
          :src="question.imageUrl"
          :alt="question.text"
          class="question-image"
          loading="lazy"
        />
      </div>

      <!-- Answer Options -->
      <div class="answer-options">
        <button
          v-for="(answer, index) in question.answers"
          :key="index"
          type="button"
          class="answer-option"
          @click="selectAnswer(index)"
        >
          <span class="answer-letter">{{ getLetterForIndex(index) }}</span>
          <span class="answer-content">
            <img
              v-if="answer.imageUrl"
              :src="answer.imageUrl"
              :alt="answer.text"
              class="answer-image"
              loading="lazy"
            />
            <span class="answer-text">{{ answer.text }}</span>
          </span>
        </button>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '@top-x/shared/components/Card.vue';
import type { QuizQuestionViewModel } from '@/stores/quiz';

interface Props {
  question: QuizQuestionViewModel;
  direction: 'ltr' | 'rtl';
  canGoBack?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-answer', index: number): void;
  (e: 'go-back'): void;
}>();

const getLetterForIndex = (index: number): string => {
  return String.fromCharCode(65 + index); // A, B, C, D...
};

const selectAnswer = (index: number) => {
  emit('select-answer', index);
};

const goBack = () => {
  emit('go-back');
};
</script>

<style scoped>
.quiz-question {
  width: 100%;
}

.question-card {
  background: rgba(10, 12, 25, 0.85);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.question-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-button {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-text-primary);
}

.question-text {
  flex: 1;
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
}

.question-image-wrapper {
  margin-bottom: 1.5rem;
  border-radius: 12px;
  overflow: hidden;
}

.question-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  display: block;
}

.answer-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.answer-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.answer-option:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--quiz-primary, #6366f1);
  transform: translateY(-2px);
}

.answer-option:active {
  transform: translateY(0);
}

.answer-letter {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
}

.answer-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.answer-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.answer-text {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.4;
}

/* RTL Support */
.quiz-question.is-rtl {
  direction: rtl;
}

.quiz-question.is-rtl .answer-option {
  text-align: right;
}

.quiz-question.is-rtl .back-icon {
  transform: scaleX(-1);
}

@media (max-width: 768px) {
  .question-card {
    padding: 1.5rem;
  }

  .question-header {
    margin-bottom: 1.25rem;
  }

  .back-button {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .question-text {
    font-size: 1.2rem;
  }

  .answer-option {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .answer-letter {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
  }

  .answer-image {
    width: 40px;
    height: 40px;
  }

  .answer-text {
    font-size: 0.95rem;
  }
}
</style>


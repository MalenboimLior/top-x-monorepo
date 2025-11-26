<template>
  <div class="personality-result">
    <!-- Result Header -->
    <div class="result-header">
      <span class="result-label">Your Result</span>
      <h2 class="result-title">{{ resultTitle }}</h2>
    </div>

    <!-- Result Image -->
    <div v-if="resultImage" class="result-image-wrapper">
      <img :src="resultImage" :alt="resultTitle" class="result-image" loading="lazy" />
    </div>

    <!-- Result Description -->
    <p class="result-description">{{ resultDescription }}</p>

    <!-- Score Breakdown -->
    <div v-if="showBreakdown && sortedBuckets.length > 0" class="score-breakdown">
      <h3 class="breakdown-title">Score Breakdown</h3>
      <div class="breakdown-bars">
        <div
          v-for="bucket in sortedBuckets"
          :key="bucket.id"
          class="breakdown-item"
        >
          <div class="breakdown-header">
            <span class="breakdown-label">{{ bucket.label }}</span>
            <span class="breakdown-value">{{ bucket.score }}</span>
          </div>
          <div class="breakdown-bar">
            <div
              class="breakdown-bar-fill"
              :style="{ width: `${getBarWidth(bucket.score)}%` }"
              :class="{ 'is-winner': bucket.id === result.winningBucketId }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PersonalityScoreResult } from '@top-x/shared/quiz/scoring';
import type { QuizThemeConfig } from '@top-x/shared/types/quiz';

interface Props {
  result: PersonalityScoreResult;
  theme: QuizThemeConfig;
  showBreakdown?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showBreakdown: true,
});

const resultTitle = computed(() => {
  return props.result.result?.title ?? 'Your Result';
});

const resultDescription = computed(() => {
  return props.result.result?.description ?? '';
});

const resultImage = computed(() => {
  return props.result.result?.imageUrl ?? null;
});

const sortedBuckets = computed(() => {
  return props.result.sortedBuckets ?? [];
});

const maxScore = computed(() => {
  if (sortedBuckets.value.length === 0) return 1;
  return Math.max(...sortedBuckets.value.map(b => b.score), 1);
});

const getBarWidth = (score: number): number => {
  return Math.round((score / maxScore.value) * 100);
};
</script>

<style scoped>
.personality-result {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
}

/* Result Header */
.result-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--quiz-primary, #6366f1);
  font-weight: 600;
}

.result-title {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Result Image */
.result-image-wrapper {
  display: flex;
  justify-content: center;
}

.result-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Result Description */
.result-description {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 500px;
  margin: 0 auto;
}

/* Score Breakdown */
.score-breakdown {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 1.25rem;
  text-align: left;
}

.breakdown-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  margin: 0 0 1rem;
}

.breakdown-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.breakdown-label {
  color: var(--color-text-primary);
  font-weight: 500;
}

.breakdown-value {
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.breakdown-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.breakdown-bar-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  transition: width 0.5s ease;
}

.breakdown-bar-fill.is-winner {
  background: linear-gradient(90deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
}

@media (max-width: 768px) {
  .score-breakdown {
    padding: 1rem;
  }

  .result-image {
    max-width: 150px;
    max-height: 150px;
  }
}
</style>


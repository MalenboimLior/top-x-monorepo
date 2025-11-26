<template>
  <div class="archetype-result">
    <!-- Result Header -->
    <div class="result-header">
      <span class="result-label">Your Archetype</span>
      <h2 class="result-title">{{ resultTitle }}</h2>
    </div>

    <!-- Radar Chart -->
    <div class="radar-section">
      <RadarChart
        :axes="axisLabels"
        :primary-color="theme.primaryColor"
        :secondary-color="theme.secondaryColor"
      />
    </div>

    <!-- Result Image -->
    <div v-if="resultImage" class="result-image-wrapper">
      <img :src="resultImage" :alt="resultTitle" class="result-image" loading="lazy" />
    </div>

    <!-- Result Description -->
    <p class="result-description">{{ resultDescription }}</p>

    <!-- Axis Breakdown -->
    <div class="axis-breakdown">
      <h3 class="breakdown-title">Your Profile</h3>
      <div class="axis-items">
        <div
          v-for="axis in axisLabels"
          :key="axis.id"
          class="axis-item"
        >
          <div class="axis-labels">
            <span class="axis-low" :class="{ active: axis.direction === 'low' }">
              {{ axis.lowLabel }}
            </span>
            <span class="axis-high" :class="{ active: axis.direction === 'high' }">
              {{ axis.highLabel }}
            </span>
          </div>
          <div class="axis-bar">
            <div class="axis-bar-track">
              <div
                class="axis-bar-fill"
                :style="{ width: `${axis.normalizedScore}%` }"
              ></div>
              <div
                class="axis-bar-indicator"
                :style="{ left: `${axis.normalizedScore}%` }"
              ></div>
            </div>
          </div>
          <div class="axis-score">{{ axis.normalizedScore }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import RadarChart from './RadarChart.vue';
import type { ArchetypeScoreResult } from '@top-x/shared/quiz/scoring';
import type { QuizThemeConfig } from '@top-x/shared/types/quiz';

interface Props {
  result: ArchetypeScoreResult;
  theme: QuizThemeConfig;
}

const props = defineProps<Props>();

const resultTitle = computed(() => {
  return props.result.result?.title ?? 'Your Archetype';
});

const resultDescription = computed(() => {
  return props.result.result?.description ?? '';
});

const resultImage = computed(() => {
  return props.result.result?.imageUrl ?? null;
});

const axisLabels = computed(() => {
  return props.result.axisLabels ?? [];
});
</script>

<style scoped>
.archetype-result {
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

/* Radar Section */
.radar-section {
  padding: 1rem 0;
}

/* Result Image */
.result-image-wrapper {
  display: flex;
  justify-content: center;
}

.result-image {
  max-width: 150px;
  max-height: 150px;
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

/* Axis Breakdown */
.axis-breakdown {
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
  text-align: center;
}

.axis-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.axis-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.axis-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 500;
  grid-column: 1 / -1;
}

.axis-low,
.axis-high {
  color: var(--color-text-tertiary);
  transition: color 0.3s ease;
}

.axis-low.active,
.axis-high.active {
  color: var(--quiz-primary, #6366f1);
  font-weight: 600;
}

.axis-bar {
  flex: 1;
  position: relative;
}

.axis-bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: visible;
  position: relative;
}

.axis-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  border-radius: 999px;
  transition: width 0.5s ease;
}

.axis-bar-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: var(--quiz-primary, #6366f1);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: left 0.5s ease;
}

.axis-score {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: right;
}

@media (max-width: 768px) {
  .axis-breakdown {
    padding: 1rem;
  }

  .axis-labels {
    font-size: 0.8rem;
  }

  .axis-bar-track {
    height: 6px;
  }

  .axis-bar-indicator {
    width: 14px;
    height: 14px;
  }
}
</style>


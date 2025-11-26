<template>
  <div class="radar-chart-wrapper">
    <svg
      :viewBox="`0 0 ${size} ${size}`"
      class="radar-chart"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- Background Grid -->
      <g class="radar-grid">
        <polygon
          v-for="level in gridLevels"
          :key="level"
          :points="getGridPoints(level)"
          class="radar-grid-level"
        />
        <!-- Axis lines -->
        <line
          v-for="(_, index) in axes"
          :key="`axis-${index}`"
          :x1="center"
          :y1="center"
          :x2="getAxisPoint(index, 1).x"
          :y2="getAxisPoint(index, 1).y"
          class="radar-axis-line"
        />
      </g>

      <!-- Data Area -->
      <polygon
        :points="dataPoints"
        class="radar-data-area"
        :style="{ fill: fillColor, stroke: strokeColor }"
      />

      <!-- Data Points -->
      <circle
        v-for="(point, index) in dataPointCoords"
        :key="`point-${index}`"
        :cx="point.x"
        :cy="point.y"
        r="6"
        class="radar-data-point"
        :style="{ fill: strokeColor }"
      />

      <!-- Axis Labels -->
      <text
        v-for="(axis, index) in axes"
        :key="`label-${index}`"
        :x="getLabelPosition(index).x"
        :y="getLabelPosition(index).y"
        class="radar-label"
        :text-anchor="getLabelAnchor(index)"
        :dominant-baseline="getLabelBaseline(index)"
      >
        {{ axis.direction === 'high' ? axis.highLabel : axis.lowLabel }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface AxisData {
  id: string;
  lowLabel: string;
  highLabel: string;
  score: number;
  normalizedScore: number;
  direction: 'low' | 'high';
}

interface Props {
  axes: AxisData[];
  size?: number;
  gridLevels?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 300,
  gridLevels: 4,
  primaryColor: '#6366f1',
  secondaryColor: '#ec4899',
});

const center = computed(() => props.size / 2);
const radius = computed(() => (props.size / 2) * 0.75); // 75% of half size for padding

const fillColor = computed(() => {
  return `${props.primaryColor}40`; // 25% opacity
});

const strokeColor = computed(() => props.primaryColor);

const ariaLabel = computed(() => {
  const descriptions = props.axes.map(
    (axis) => `${axis.direction === 'high' ? axis.highLabel : axis.lowLabel}: ${axis.normalizedScore}%`
  );
  return `Radar chart showing: ${descriptions.join(', ')}`;
});

const getAxisPoint = (index: number, ratio: number) => {
  const angle = (Math.PI * 2 * index) / props.axes.length - Math.PI / 2;
  return {
    x: center.value + radius.value * ratio * Math.cos(angle),
    y: center.value + radius.value * ratio * Math.sin(angle),
  };
};

const getGridPoints = (level: number): string => {
  const ratio = level / props.gridLevels;
  return props.axes
    .map((_, index) => {
      const point = getAxisPoint(index, ratio);
      return `${point.x},${point.y}`;
    })
    .join(' ');
};

const dataPointCoords = computed(() => {
  return props.axes.map((axis, index) => {
    // Convert 0-100 normalized score to 0-1 ratio
    const ratio = axis.normalizedScore / 100;
    return getAxisPoint(index, ratio);
  });
});

const dataPoints = computed(() => {
  return dataPointCoords.value.map((point) => `${point.x},${point.y}`).join(' ');
});

const getLabelPosition = (index: number) => {
  const angle = (Math.PI * 2 * index) / props.axes.length - Math.PI / 2;
  const labelRadius = radius.value * 1.15;
  return {
    x: center.value + labelRadius * Math.cos(angle),
    y: center.value + labelRadius * Math.sin(angle),
  };
};

const getLabelAnchor = (index: number): string => {
  const angle = (Math.PI * 2 * index) / props.axes.length - Math.PI / 2;
  const cos = Math.cos(angle);
  if (Math.abs(cos) < 0.1) return 'middle';
  return cos > 0 ? 'start' : 'end';
};

const getLabelBaseline = (index: number): string => {
  const angle = (Math.PI * 2 * index) / props.axes.length - Math.PI / 2;
  const sin = Math.sin(angle);
  if (Math.abs(sin) < 0.1) return 'middle';
  return sin > 0 ? 'hanging' : 'baseline';
};
</script>

<style scoped>
.radar-chart-wrapper {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.radar-chart {
  width: 100%;
  height: auto;
}

.radar-grid-level {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1;
}

.radar-axis-line {
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 1;
}

.radar-data-area {
  fill-opacity: 0.3;
  stroke-width: 2;
  transition: all 0.5s ease;
}

.radar-data-point {
  transition: all 0.3s ease;
}

.radar-data-point:hover {
  r: 8;
}

.radar-label {
  font-size: 11px;
  font-weight: 600;
  fill: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .radar-chart-wrapper {
    max-width: 250px;
  }

  .radar-label {
    font-size: 10px;
  }
}
</style>


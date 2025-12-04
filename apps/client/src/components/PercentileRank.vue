<!-- Shows how a user's score ranks globally -->
<!-- Supports auto-fetch mode or prop-based data -->
<template>
  <div ref="containerRef" class="percentile-rank-container">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <span class="loader"></span>
      <p>Calculating your rank...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="error-state">
      <p>{{ fetchError }}</p>
    </div>

    <!-- Content -->
    <div v-else-if="displayPercentile !== null" class="rank-content">
      <div class="media animate-item" style="--animation-delay: 0s;">
        <div class="media-left">
          <figure class="image is-64x64">
            <img :src="userImage" alt="User image" class="is-rounded" />
          </figure>
        </div>
        <div class="media-content">
          <p class="username has-text-white">{{ usernameWithAt }}</p>
          <p class="score has-text-white">Scored {{ displayScore }} pts!</p>
        </div>
      </div>
      <p class="percentile has-text-white animate-item" style="--animation-delay: 0.2s;">
        🏆 |
        <span v-for="(item, index) in progressBarItems" :key="index" class="progress-char" :class="{ 'filled': item.isFilled }" :style="{ '--char-delay': `${index * 0.1}s` }">
          {{ item.char }}
        </span>
        | {{ displayPercentile }}% 🏆
      </p>
      <p class="rank-text has-text-success animate-item" style="--animation-delay: 0.4s;">
        You're in the top {{ displayPercentile }}% on X! #SmartestOnX
      </p>
      <p class="rank-text has-text-success animate-item" style="--animation-delay: 0.5s;">
        Outscored {{ displayUsersTopped }} players on X!
      </p>
      <p class="challenge has-text-white animate-item" style="--animation-delay: 0.6s;">
        Can you top me? 🔝
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import html2canvas from 'html2canvas';
import { useUserStore } from '@/stores/user';
import { getUserPercentile, type DateRange } from '@/services/leaderboard';

interface Props {
  userImage: string;
  score: number;
  bestScore?: number;
  // Optional: if provided, use these instead of fetching
  percentile?: number;
  usersTopped?: number;
  // Auto-fetch mode props
  gameId?: string;
  userId?: string;
  autoFetch?: boolean;
  dateRange?: DateRange;
  dailyChallengeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  userImage: '/assets/profile.png',
  score: 0,
  bestScore: 0,
  percentile: undefined,
  usersTopped: undefined,
  gameId: undefined,
  userId: undefined,
  autoFetch: false,
  dateRange: 'allTime',
  dailyChallengeId: undefined,
});

const userStore = useUserStore();
const containerRef = ref<HTMLDivElement | null>(null);

// Auto-fetch state
const isLoading = ref(false);
const fetchError = ref<string | null>(null);
const fetchedPercentile = ref<number | null>(null);
const fetchedTotal = ref<number>(0);

// Computed display values (prefer props, fall back to fetched)
const displayPercentile = computed(() => {
  if (props.percentile !== undefined) {
    return props.percentile;
  }
  return fetchedPercentile.value;
});

const displayUsersTopped = computed(() => {
  if (props.usersTopped !== undefined) {
    return props.usersTopped;
  }
  // Calculate from fetched data
  if (fetchedPercentile.value !== null && fetchedTotal.value > 0) {
    // If percentile is 10, user beat 90% of players
    const beatPercent = 100 - fetchedPercentile.value;
    return Math.round((beatPercent / 100) * fetchedTotal.value);
  }
  return 0;
});

const displayScore = computed(() => {
  return props.score || props.bestScore || 0;
});

const usernameWithAt = computed(() => {
  const username = userStore.profile?.username?.replace(/^@+/, '') || 'Player';
  return `@${username}`;
});

const progressBarItems = computed(() => {
  const percentile = displayPercentile.value ?? 0;
  // Invert: lower percentile = more filled (better rank)
  // If percentile is 10, user is in top 10%, so fill 9 bars (90% filled)
  const filled = Math.round((100 - percentile) / 10);
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

// For share text, maintain the string format
const progressBarString = computed(() => {
  const percentile = displayPercentile.value ?? 0;
  const filled = Math.round((100 - percentile) / 10);
  const empty = 10 - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
});

// Animation control
const isAnimated = ref(false);
const shareReady = ref(true);

// Fetch percentile data
const fetchPercentile = async () => {
  if (!props.autoFetch || !props.gameId || !props.userId) {
    return;
  }

  // Don't fetch if props already provide the data
  if (props.percentile !== undefined) {
    return;
  }

  isLoading.value = true;
  fetchError.value = null;

  try {
    const result = await getUserPercentile(props.gameId, {
      uid: props.userId,
      dateRange: props.dateRange,
      dailyChallengeId: props.dailyChallengeId,
    });

    if (result.error) {
      fetchError.value = result.error;
      return;
    }

    fetchedPercentile.value = result.percentile;
    fetchedTotal.value = result.total;
  } catch (e: any) {
    fetchError.value = e?.message || 'Failed to calculate rank';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  shareReady.value = true;
  isAnimated.value = true;
  
  // Auto-fetch if enabled
  if (props.autoFetch) {
    fetchPercentile();
  }
});

// Watch for prop changes that should trigger a refetch
watch(
  () => [props.gameId, props.userId, props.dateRange, props.dailyChallengeId],
  () => {
    if (props.autoFetch) {
      fetchPercentile();
    }
  }
);

watch(
  () => displayPercentile.value,
  () => {
    isAnimated.value = false;
    setTimeout(() => {
      isAnimated.value = true;
    }, 50);
  }
);

async function getImageDataUrl(): Promise<string | null> {
  if (!containerRef.value) {
    return null;
  }
  try {
    shareReady.value = false;
    await nextTick();
    containerRef.value.classList.add('share-capture');
    const canvas = await html2canvas(containerRef.value, {
      backgroundColor: '#0a0c19',
      scale: 3,
      useCORS: true,
      logging: false,
      ignoreElements: (element) => element.tagName === 'BUTTON',
    });
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (error) {
    console.error('[PercentileRank] Failed to generate image', error);
    return null;
  } finally {
    containerRef.value?.classList.remove('share-capture');
    shareReady.value = true;
  }
}

defineExpose({ getImageDataUrl, progressBarString });
</script>

<style scoped>
.percentile-rank-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.percentile-rank-container.share-capture .animate-item {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.loader {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-danger, #ff6b6b);
}

.rank-content {
  text-align: center;
  padding: 1rem;
}

.username {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.score {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.percentile {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.rank-text {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.challenge {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.image.is-64x64 {
  width: 64px;
  height: 64px;
}

.is-rounded {
  border-radius: 50%;
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
</style>

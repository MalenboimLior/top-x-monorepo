<template>
  <div class="trivia-end-screen">
    <Card class="summary-card">
      <header class="summary-header">
        <h2 class="summary-title">Game Over</h2>
        <p class="summary-subtitle">{{ headline }}</p>
      </header>

      <div class="summary-grid">
        <div class="summary-stat">
          <span class="stat-label">Score</span>
          <span class="stat-value">{{ score }}</span>
          <small class="stat-sub">Best {{ bestScore }}</small>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Streak</span>
          <span class="stat-value">{{ sessionBestStreak }}</span>
          <small class="stat-sub">All-time {{ bestStreak }}</small>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value">{{ accuracy }}%</span>
          <small class="stat-sub">{{ correctAttemptCount }} / {{ attemptCount }} correct</small>
        </div>
      </div>

      <!-- PercentileRank with auto-fetch mode -->
      <div v-if="isLoggedIn && gameId && userId" class="percentile-wrapper">
        <PercentileRank
          ref="percentileRankRef"
          :user-image="userImage"
          :score="score"
          :best-score="bestScore"
          :game-id="gameId"
          :user-id="userId"
          :auto-fetch="true"
          :daily-challenge-id="dailyChallengeId"
        />
      </div>

      <div v-if="inviter" class="inviter-callout">
        <img :src="inviter.photoURL" alt="Inviter avatar" class="inviter-avatar" />
        <div>
          <p class="inviter-title">
            {{ inviter.displayName }} scored {{ inviter.score }}.
            <span v-if="score > inviter.score" class="callout-win">You topped it! 🔥</span>
            <span v-else class="callout-try">Go again to claim the crown.</span>
          </p>
        </div>
      </div>

      <div class="summary-actions">
        <CustomButton
          type="is-primary"
          :icon="['fas', 'redo']"
          label="Play again"
          @click="$emit('play-again')"
        />
        <ShareButton
          v-if="isLoggedIn && shareButtonImage"
          :share-text="shareContent"
          :image-url="shareButtonImage"
          file-name="top-x-trivia"
        />
        <CustomButton
          v-if="!isLoggedIn"
          type="is-dark"
          :icon="['fab', 'x-twitter']"
          label="Login with X"
          @click="$emit('login')"
        />
      </div>

      <div v-if="displayAnswerSummary" class="answer-review">
        <h3 class="answer-review-title">Answer Review</h3>
        <ol class="answer-review-list">
          <li
            v-for="(entry, entryIndex) in answerSummary"
            :key="entry.questionId || entryIndex"
            class="answer-review-item"
          >
            <div class="answer-review-question">
              <span class="answer-review-number">Q{{ entryIndex + 1 }}</span>
              <p class="answer-review-text">{{ entry.question }}</p>
            </div>
            <ul class="answer-review-options">
              <li
                v-for="(option, optionIndex) in entry.options"
                :key="optionIndex"
                class="answer-review-option"
                :class="reviewOptionClass(entry, optionIndex)"
              >
                <div class="answer-review-option-header">
                  <span class="answer-review-option-index">{{ optionIndexLabel(optionIndex) }}</span>
                  <span class="answer-review-option-text">{{ option.text }}</span>
                </div>
                <div v-if="option.imageUrl" class="answer-review-option-image">
                  <img :src="option.imageUrl" :alt="`Option ${optionIndex + 1}`" />
                </div>
                <div class="answer-review-tags">
                  <span
                    v-if="entry.correctIndex === optionIndex"
                    class="answer-review-chip is-correct"
                  >
                    Correct answer
                  </span>
                  <span
                    v-if="entry.selectedIndex === optionIndex"
                    class="answer-review-chip"
                    :class="entry.correctIndex === optionIndex ? 'is-player-correct' : 'is-player-incorrect'"
                  >
                    You
                  </span>
                  <span
                    v-else-if="entry.selectedIndex === null && entry.correctIndex === optionIndex"
                    class="answer-review-chip is-player-incorrect"
                  >
                    You missed this
                  </span>
                </div>
              </li>
            </ul>
          </li>
        </ol>
      </div>
    </Card>

      <!-- New Leaderboard Component with tabs -->
    <Card v-if="gameId" class="leaderboard-card">
      <Leaderboard
        ref="leaderboardRef"
        :game-id="gameId"
        :current-user-id="userId"
        :frenemies="frenemies"
        :daily-challenge-id="dailyChallengeId"
        :refresh-key="leaderboardRefreshKey"
        default-view="top"
        :show-date-range="true"
        :limit="10"
        title="Leaderboard"
        @add-frenemy="$emit('add-frenemy', $event)"
      />
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import PercentileRank from '@/components/PercentileRank.vue';
import ShareButton from '@/components/ShareButton.vue';
import { useUserStore } from '@/stores/user';
import type { TriviaAnswerReview } from '@/stores/trivia/types';

interface InviterDetails {
  displayName: string;
  photoURL: string;
  score: number;
}

interface Props {
  gameId: string;
  isLoggedIn: boolean;
  score: number;
  bestScore: number;
  sessionBestStreak: number;
  bestStreak: number;
  streak: number;
  attemptCount: number;
  correctAttemptCount: number;
  theme: Record<string, unknown>;
  inviter: InviterDetails | null;
  userImage: string;
  shareUrl: string;
  shareText: string;
  language: string;
  dailyChallengeId?: string;
  showAnswerSummary?: boolean;
  answerSummary?: TriviaAnswerReview[];
}

const props = withDefaults(defineProps<Props>(), {
  isLoggedIn: false,
  score: 0,
  bestScore: 0,
  sessionBestStreak: 0,
  bestStreak: 0,
  streak: 0,
  attemptCount: 0,
  correctAttemptCount: 0,
  inviter: null,
  userImage: 'https://via.placeholder.com/48',
  shareUrl: '',
  shareText: '',
  dailyChallengeId: undefined,
  showAnswerSummary: false,
  answerSummary: () => [],
});

defineEmits<{
  (e: 'play-again'): void;
  (e: 'login'): void;
  (e: 'add-frenemy', uid: string): void;
}>();

const userStore = useUserStore();

const accuracy = computed(() => {
  if (!props.attemptCount) {
    return 0;
  }
  return Math.round((props.correctAttemptCount / props.attemptCount) * 100);
});

const headline = computed(() => {
  if (props.score === props.bestScore && props.score > 0) {
    return 'New personal best!';
  }
  if (props.sessionBestStreak === props.bestStreak && props.sessionBestStreak > 0) {
    return 'Streak record shattered!';
  }
  return "Let's climb higher.";
});

const frenemies = computed(() => userStore.profile?.frenemies || []);
const userId = computed(() => userStore.user?.uid ?? undefined);
const displayAnswerSummary = computed(
  () => props.showAnswerSummary && props.answerSummary.length > 0
);

const optionIndexLabel = (index: number) => String.fromCharCode(65 + index);

const reviewOptionClass = (entry: TriviaAnswerReview, optionIndex: number) => ({
  'is-correct': entry.correctIndex === optionIndex,
  'is-selected': entry.selectedIndex === optionIndex,
  'is-selected-correct': entry.selectedIndex === optionIndex && entry.correctIndex === optionIndex,
  'is-selected-incorrect':
    entry.selectedIndex === optionIndex && entry.correctIndex !== optionIndex,
  'is-missed': entry.selectedIndex === null && entry.correctIndex === optionIndex,
});

const shareContent = computed(() => {
  const parts = [props.shareText, props.shareUrl].filter((value): value is string => Boolean(value));
  return parts.join(' ');
});

const percentileRankRef = ref<InstanceType<typeof PercentileRank> | null>(null);
const leaderboardRef = ref<InstanceType<typeof Leaderboard> | null>(null);
const shareButtonImage = ref<string | null>(null);
const isGeneratingShareImage = ref(false);
const leaderboardRefreshKey = ref(0);
const hasRefreshedAfterSubmission = ref(false);

// Watch for user's score update in profile (indicates score submission completed)
watch(
  () => {
    if (!props.gameId || !userId.value) return null;
    return userStore.profile?.games?.['trivia']?.[props.gameId]?.score;
  },
  (newScore, oldScore) => {
    // If score was updated and matches current session score, refresh leaderboard
    if (
      !hasRefreshedAfterSubmission.value &&
      newScore !== undefined &&
      newScore !== oldScore &&
      newScore >= props.score
    ) {
      hasRefreshedAfterSubmission.value = true;
      leaderboardRefreshKey.value += 1;
    }
  },
  { immediate: false }
);

// Refresh after component mounts to account for async score submission
onMounted(() => {
  if (props.isLoggedIn && props.score > 0) {
    // Give score submission time to complete, then refresh
    // The watch above will handle if profile updates before this timeout
    setTimeout(() => {
      if (!hasRefreshedAfterSubmission.value) {
        hasRefreshedAfterSubmission.value = true;
        leaderboardRefreshKey.value += 1;
      }
    }, 3000); // 3 second delay to allow score submission to complete
  }
});

async function generateShareImage(): Promise<void> {
  if (!props.isLoggedIn) {
    shareButtonImage.value = null;
    return;
  }

  const generator = percentileRankRef.value?.getImageDataUrl;
  if (!generator) {
    shareButtonImage.value = null;
    return;
  }

  if (isGeneratingShareImage.value) {
    return;
  }

  isGeneratingShareImage.value = true;
  try {
    await nextTick();
    const image = await generator();
    shareButtonImage.value = image;
  } catch (error) {
    console.error('[TriviaEndScreen] Failed to generate share image', error);
    shareButtonImage.value = null;
  } finally {
    isGeneratingShareImage.value = false;
  }
}

watch(
  () => [props.isLoggedIn, props.bestScore, props.score],
  () => {
    void generateShareImage();
  },
  { immediate: true }
);

onMounted(() => {
  void generateShareImage();
});

watch(
  () => percentileRankRef.value,
  (value) => {
    if (value) {
      void generateShareImage();
    }
  }
);
</script>

<style scoped>
.trivia-end-screen {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.summary-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: 18px;
  padding: 2rem;
  color: var(--color-text-primary);
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
}

.summary-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.summary-title {
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  margin: 0;
}

.summary-subtitle {
  margin: 0.35rem 0 0;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.summary-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: stretch;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 0.25rem;
}

.summary-grid::-webkit-scrollbar {
  display: none;
}

.summary-stat {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  scroll-snap-align: center;
}

.stat-label {
  display: block;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
}

.stat-sub {
  display: block;
  margin-top: 0.35rem;
  color: rgba(255, 255, 255, 0.6);
}

.percentile-wrapper {
  margin-bottom: 1.5rem;
}

.inviter-callout {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.95rem 1.2rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  margin-bottom: 1.5rem;
}

.inviter-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.inviter-title {
  margin: 0;
  font-weight: 600;
}

.callout-win {
  color: #4ade80;
  margin-left: 0.35rem;
}

.callout-try {
  color: #f97316;
  margin-left: 0.35rem;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.leaderboard-card {
  background: rgba(10, 12, 25, 0.78);
  border-radius: 18px;
  padding: 1.5rem;
  color: #fff;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
}

.answer-review {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 720px;
  margin: 2rem auto 0;
  box-sizing: border-box;
}

.answer-review-title {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.answer-review-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.answer-review-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.answer-review-question {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.answer-review-number {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
}

.answer-review-text {
  margin: 0;
  color: #fff;
  font-weight: 600;
}

.answer-review-options {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.answer-review-option {
  background: rgba(12, 16, 31, 0.6);
  border-radius: 12px;
  padding: 0.75rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.answer-review-option.is-correct {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

.answer-review-option.is-selected-incorrect {
  border-color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

.answer-review-option.is-selected-correct {
  border-color: #4ade80;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.25);
}

.answer-review-option.is-missed {
  border-color: rgba(255, 255, 255, 0.18);
  border-style: dashed;
}

.answer-review-option-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.answer-review-option-index {
  display: inline-flex;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  font-weight: 700;
}

.answer-review-option-text {
  font-weight: 600;
  color: #fff;
}

.answer-review-option-image img {
  width: 100%;
  max-width: 160px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.answer-review-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.answer-review-chip {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  font-weight: 600;
}

.answer-review-chip.is-correct {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.answer-review-chip.is-player-correct {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.answer-review-chip.is-player-incorrect {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

@media (max-width: 768px) {
  .summary-card {
    padding: 1.35rem;
    border-radius: 16px;
  }

  .summary-grid {
    gap: 0.65rem;
    padding-bottom: 0.15rem;
  }

  .summary-stat {
    min-width: 160px;
    padding: 0.85rem 1rem;
  }

  .summary-actions {
    padding: 0 0.5rem;
  }

  .leaderboard-card {
    padding: 1.25rem;
    border-radius: 16px;
  }

  .answer-review {
    padding: 0 0.5rem;
    margin-top: 1.5rem;
  }

  .answer-review-item {
    padding: 1rem;
  }
}
</style>

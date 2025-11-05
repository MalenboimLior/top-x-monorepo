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

      <div v-if="percentileRank > 0 && isLoggedIn" class="percentile-wrapper">
        <PercentileRank
          :user-image="userImage"
          :username="username"
          :percentile="percentileRank"
          :best-score="bestScore"
          :users-topped="usersTopped"
          :score="score"
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
        <CustomButton
          v-if="shareUrl"
          type="is-info"
          :icon="['fas', 'share-nodes']"
          :label="isLoggedIn ? 'Share run' : 'Share challenge'"
          @click="$emit('share')"
        />
        <CustomButton
          v-if="!isLoggedIn"
          type="is-dark"
          :icon="['fab', 'x-twitter']"
          label="Login with X"
          @click="$emit('login')"
        />
      </div>
    </Card>

    <Card v-if="leaderboard.length" class="leaderboard-card">
      <Leaderboard
        title="Top Players"
        :entries="leaderboard"
        :frenemies="frenemies"
        :current-user-id="userId"
        @add-frenemy="$emit('add-frenemy', $event)"
      />
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import PercentileRank from '@/components/PercentileRank.vue';
import { useUserStore } from '@/stores/user';

interface InviterDetails {
  displayName: string;
  photoURL: string;
  score: number;
}

interface Props {
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
  leaderboard: Array<Record<string, unknown>>;
  percentileRank: number;
  usersTopped: number;
  userImage: string;
  shareUrl: string;
  shareText: string;
  language: string;
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
  leaderboard: () => [],
  percentileRank: 0,
  usersTopped: 0,
  userImage: 'https://via.placeholder.com/48',
  shareUrl: '',
  shareText: '',
});

defineEmits<{
  (e: 'play-again'): void;
  (e: 'share'): void;
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

const username = computed(() => userStore.profile?.username || 'Player');
const frenemies = computed(() => userStore.profile?.frenemies || []);
const userId = computed(() => userStore.user?.uid ?? null);
</script>

<style scoped>
.trivia-end-screen {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.summary-card {
  background: rgba(10, 12, 25, 0.78);
  border-radius: 18px;
  padding: 2rem;
  color: #fff;
  box-shadow: 0 24px 45px rgba(0, 0, 0, 0.3);
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
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-stat {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1rem 1.25rem;
}

.stat-label {
  display: block;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 1.75rem;
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
}

@media (max-width: 768px) {
  .summary-card {
    padding: 1.5rem;
  }
}
</style>

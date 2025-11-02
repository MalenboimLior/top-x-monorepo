<template>
  <div class="daily-challenge-calendar">
    <div v-if="loading" class="calendar-loading">Loading challenges...</div>
    <div v-else-if="error" class="calendar-error">{{ error }}</div>
    <div v-else-if="challengeItems.length === 0" class="calendar-empty">
      No daily challenges played yet for this game.
    </div>
    <div v-else class="calendar-grid">
      <div
        v-for="item in challengeItems"
        :key="item.dailyChallengeId"
        class="calendar-item"
        :class="`status-${item.status}`"
        :title="item.tooltip"
      >
        <div class="calendar-item__icon">
          <font-awesome-icon :icon="item.icon" />
        </div>
        <div class="calendar-item__id">{{ item.challengeId }}</div>
        <div class="calendar-item__answer">{{ item.answer }}</div>
        <div class="calendar-item__date">{{ item.date }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { DailyChallengeRewardRecord } from '@top-x/shared/types/user';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{
  gameId: string;
}>();

const userStore = useUserStore();
const loading = ref(false);
const error = ref<string | null>(null);
const challengeData = ref<Map<string, DailyChallenge>>(new Map());

type ChallengeStatus =
  | 'right-before-close'
  | 'wrong-before-close'
  | 'right-after-close'
  | 'wrong-after-close'
  | 'answered-before-reveal'
  | 'answered-after-reveal';

interface ChallengeItem {
  dailyChallengeId: string;
  challengeId: string;
  date: string;
  answer: string;
  status: ChallengeStatus;
  icon: string[];
  tooltip: string;
}

const challengeItems = computed<ChallengeItem[]>(() => {
  const rewards = userStore.dailyChallengeRewards.filter(
    (r) => r.gameId === props.gameId
  );

  return rewards
    .map((reward): ChallengeItem | null => {
      const challenge = challengeData.value.get(reward.dailyChallengeId);
      if (!challenge) return null;

      const answer = extractAnswer(challenge);
      const schedule = challenge.schedule;
      const updatedAtMillis = Date.parse(reward.updatedAt);
      const closesAtMillis = Date.parse(schedule.closesAt);
      const revealAtMillis = Date.parse(schedule.revealAt || reward.revealAt);

      // Check if user requested answer check (solveState is solved or failed)
      const requestedCheck = reward.solveState === 'solved' || reward.solveState === 'failed';
      // For solved/failed, determine correctness: solved = correct, failed with isMatch=true might still be correct (edge case), failed typically = wrong
      const isCorrect = reward.solveState === 'solved' || (reward.attemptMetadata?.isMatch === true);
      const updatedBeforeClose = !Number.isNaN(closesAtMillis) && updatedAtMillis < closesAtMillis;
      const updatedAfterReveal = !Number.isNaN(revealAtMillis) && updatedAtMillis >= revealAtMillis;

      let status: ChallengeStatus;
      let icon: string[];
      let tooltip: string;

      if (requestedCheck) {
        // Status 1-4: User requested answer check
        if (isCorrect && updatedBeforeClose) {
          status = 'right-before-close';
          icon = ['fas', 'check-circle'];
          tooltip = 'Right answer before close';
        } else if (!isCorrect && updatedBeforeClose) {
          status = 'wrong-before-close';
          icon = ['fas', 'times-circle'];
          tooltip = 'Wrong answer before close';
        } else if (isCorrect && !updatedBeforeClose) {
          status = 'right-after-close';
          icon = ['fas', 'check-circle'];
          tooltip = 'Right answer after close';
        } else {
          status = 'wrong-after-close';
          icon = ['fas', 'times-circle'];
          tooltip = 'Wrong answer after close';
        }
      } else {
        // Status 5-6: User answered but didn't request answer check
        if (updatedAfterReveal) {
          status = 'answered-after-reveal';
          icon = ['fas', 'question-circle'];
          tooltip = 'Answered after reveal';
        } else {
          status = 'answered-before-reveal';
          icon = ['fas', 'clock'];
          tooltip = 'Answered before reveal';
        }
      }

      return {
        dailyChallengeId: reward.dailyChallengeId,
        challengeId: challenge.number?.toString() || reward.dailyChallengeId.slice(0, 8),
        date: reward.dailyChallengeDate || challenge.date,
        answer,
        status,
        icon,
        tooltip,
      };
    })
    .filter((item): item is ChallengeItem => item !== null)
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return b.date.localeCompare(a.date);
    });
});

function extractAnswer(challenge: DailyChallenge): string {
  const custom = challenge.custom;
  
  if (!custom) return '—';

  // ZoneReveal answer
  if (typeof custom === 'object' && 'answer' in custom) {
    const answer = (custom as ZoneRevealConfig).answer;
    if (answer?.solution) {
      return answer.solution;
    }
  }

  // Trivia answer (first question's correct answer)
  if (typeof custom === 'object' && 'questions' in custom) {
    const questions = (custom as TriviaConfig).questions;
    if (questions && questions.length > 0 && questions[0].correctAnswer) {
      return questions[0].correctAnswer;
    }
  }

  // Pyramid doesn't have a single answer, show placeholder
  if (typeof custom === 'object' && 'items' in custom) {
    return 'Pyramid';
  }

  return '—';
}

async function loadChallengeData() {
  if (!props.gameId) return;

  loading.value = true;
  error.value = null;

  try {
    const rewards = userStore.dailyChallengeRewards.filter(
      (r) => r.gameId === props.gameId
    );

    const challengeIds = new Set(rewards.map((r) => r.dailyChallengeId));
    
    // Load all challenge documents
    const loadPromises = Array.from(challengeIds).map(async (challengeId) => {
      if (challengeData.value.has(challengeId)) {
        return; // Already loaded
      }

      try {
        const challengeRef = doc(
          db,
          'games',
          props.gameId,
          'daily_challenges',
          challengeId
        );
        const challengeSnap = await getDoc(challengeRef);
        
        if (challengeSnap.exists()) {
          challengeData.value.set(challengeId, challengeSnap.data() as DailyChallenge);
        }
      } catch (err) {
        console.error(`Failed to load challenge ${challengeId}:`, err);
      }
    });

    await Promise.all(loadPromises);
  } catch (err: any) {
    error.value = err.message || 'Failed to load challenge data';
    console.error('Error loading challenge data:', err);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.gameId,
  () => {
    challengeData.value.clear();
    loadChallengeData();
  },
  { immediate: true }
);

watch(
  () => userStore.dailyChallengeRewards,
  () => {
    if (props.gameId) {
      loadChallengeData();
    }
  }
);
</script>

<style scoped>
.daily-challenge-calendar {
  width: 100%;
}

.calendar-loading,
.calendar-error,
.calendar-empty {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  padding: 0.5rem 0;
}

.calendar-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 100px;
}

.calendar-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.calendar-item__icon {
  font-size: 1.5rem;
}

.calendar-item__id {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.calendar-item__answer {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  word-break: break-word;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.calendar-item__date {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Status-specific colors */
.status-right-before-close {
  border-color: rgba(0, 232, 224, 0.4);
  background: rgba(0, 232, 224, 0.1);
}

.status-right-before-close .calendar-item__icon {
  color: #00e8e0;
}

.status-wrong-before-close {
  border-color: rgba(255, 100, 100, 0.4);
  background: rgba(255, 100, 100, 0.1);
}

.status-wrong-before-close .calendar-item__icon {
  color: #ff6464;
}

.status-right-after-close {
  border-color: rgba(0, 232, 224, 0.3);
  background: rgba(0, 232, 224, 0.05);
}

.status-right-after-close .calendar-item__icon {
  color: rgba(0, 232, 224, 0.7);
}

.status-wrong-after-close {
  border-color: rgba(255, 100, 100, 0.3);
  background: rgba(255, 100, 100, 0.05);
}

.status-wrong-after-close .calendar-item__icon {
  color: rgba(255, 100, 100, 0.7);
}

.status-answered-before-reveal {
  border-color: rgba(196, 255, 0, 0.3);
  background: rgba(196, 255, 0, 0.05);
}

.status-answered-before-reveal .calendar-item__icon {
  color: rgba(196, 255, 0, 0.8);
}

.status-answered-after-reveal {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
}

.status-answered-after-reveal .calendar-item__icon {
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .calendar-item {
    padding: 0.5rem;
    min-height: 80px;
  }

  .calendar-item__icon {
    font-size: 1.25rem;
  }

  .calendar-item__id {
    font-size: 0.7rem;
  }

  .calendar-item__answer {
    font-size: 0.65rem;
  }

  .calendar-item__date {
    font-size: 0.6rem;
  }
}
</style>

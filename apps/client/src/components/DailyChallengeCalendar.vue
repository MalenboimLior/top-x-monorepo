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
        <div
          v-if="item.question"
          class="calendar-item__question"
          :lang="item.questionLanguage || undefined"
        >
          {{ item.question }}
        </div>
        <div
          class="calendar-item__answer"
          :class="{ 'is-hidden': !item.answerRevealed }"
        >
          {{ item.answer }}
        </div>
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
  answerRevealed: boolean;
  question?: string;
  questionLanguage?: string;
  status: ChallengeStatus;
  icon: string[];
  tooltip: string;
}

interface ChallengeSummary {
  answerText: string;
  answerRevealed: boolean;
  questionText?: string;
  questionLanguage?: string;
}

interface ChallengeStatusInfo {
  status: ChallengeStatus;
  icon: string[];
  label: string;
}

const challengeItems = computed<ChallengeItem[]>(() => {
  const rewards = userStore.dailyChallengeRewards.filter(
    (r) => r.gameId === props.gameId
  );

  return rewards
    .map((reward): ChallengeItem | null => {
      const challenge = challengeData.value.get(reward.dailyChallengeId);
      if (!challenge) return null;

      const summary = extractChallengeSummary(challenge);
      const schedule = challenge.schedule;
      const updatedAtMillis = Date.parse(reward.updatedAt);
      const closesAtMillis = Date.parse(schedule.closesAt);
      const revealAtMillis = Date.parse(schedule.revealAt || reward.revealAt);

      // Check if user requested answer check (solveState is solved or failed)
      const requestedCheck = reward.solveState === 'solved' || reward.solveState === 'failed';
      // Determine correctness based on reward metadata.
      let isCorrect = reward.solveState === 'solved' || reward.attemptMetadata?.isMatch === true;
      if (isTriviaConfig(challenge.custom)) {
        const solveThreshold =
          typeof challenge.custom.solveThreshold === 'number'
            ? challenge.custom.solveThreshold
            : 0.8;
        const accuracy = reward.attemptMetadata?.trivia?.accuracy;
        if (typeof accuracy === 'number') {
          isCorrect = accuracy >= solveThreshold;
        }
      }
      const updatedBeforeClose = !Number.isNaN(closesAtMillis) && updatedAtMillis < closesAtMillis;
      const updatedAfterReveal = !Number.isNaN(revealAtMillis) && updatedAtMillis >= revealAtMillis;

      const statusInfo = resolveStatusInfo({
        requestedCheck,
        isCorrect,
        updatedBeforeClose,
        updatedAfterReveal,
      });
      const tooltip = buildTooltip(statusInfo.label, summary);

      return {
        dailyChallengeId: reward.dailyChallengeId,
        challengeId: challenge.number?.toString() || reward.dailyChallengeId.slice(0, 8),
        date: reward.dailyChallengeDate || challenge.date,
        answer: summary.answerText,
        answerRevealed: summary.answerRevealed,
        question: summary.questionText,
        questionLanguage: summary.questionLanguage,
        status: statusInfo.status,
        icon: statusInfo.icon,
        tooltip,
      };
    })
    .filter((item): item is ChallengeItem => item !== null)
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return b.date.localeCompare(a.date);
    });
});

function resolveStatusInfo(options: {
  requestedCheck: boolean;
  isCorrect: boolean;
  updatedBeforeClose: boolean;
  updatedAfterReveal: boolean;
}): ChallengeStatusInfo {
  const { requestedCheck, isCorrect, updatedBeforeClose, updatedAfterReveal } = options;

  if (requestedCheck) {
    if (isCorrect && updatedBeforeClose) {
      return {
        status: 'right-before-close',
        icon: ['fas', 'check-circle'],
        label: 'Right answer before close',
      };
    }

    if (!isCorrect && updatedBeforeClose) {
      return {
        status: 'wrong-before-close',
        icon: ['fas', 'times-circle'],
        label: 'Wrong answer before close',
      };
    }

    if (isCorrect && !updatedBeforeClose) {
      return {
        status: 'right-after-close',
        icon: ['fas', 'check-circle'],
        label: 'Right answer after close',
      };
    }

    return {
      status: 'wrong-after-close',
      icon: ['fas', 'times-circle'],
      label: 'Wrong answer after close',
    };
  }

  if (updatedAfterReveal) {
    return {
      status: 'answered-after-reveal',
      icon: ['fas', 'question-circle'],
      label: 'Answered after reveal',
    };
  }

  return {
    status: 'answered-before-reveal',
    icon: ['fas', 'clock'],
    label: 'Answered before reveal',
  };
}

function buildTooltip(statusLabel: string, summary: ChallengeSummary): string {
  const lines = [statusLabel];
  if (summary.questionText) {
    const rawLanguage = summary.questionLanguage?.toLowerCase();
    const showLanguage = rawLanguage ? !rawLanguage.startsWith('en') : false;
    const prefix = showLanguage && summary.questionLanguage ? `[${summary.questionLanguage}] ` : '';
    lines.push(`${prefix}${summary.questionText}`);
  }

  return lines.join('\n');
}

function extractChallengeSummary(challenge: DailyChallenge): ChallengeSummary {
  const custom = challenge.custom;

  if (!custom) {
    return { answerText: '—', answerRevealed: true };
  }

  if (isZoneRevealConfig(custom)) {
    const solution = custom.answer?.solution;
    return { answerText: solution || '—', answerRevealed: true };
  }

  if (isTriviaConfig(custom)) {
    const summaryQuestions = custom.summary?.questions ?? [];
    const summaryEntry = summaryQuestions.find((entry) => {
      return Boolean(entry?.correctAnswer || (entry?.correctAnswers && entry.correctAnswers.length > 0));
    }) ?? summaryQuestions[0];
    const fallbackQuestion = custom.questions?.[0];

    const questionText = summaryEntry?.text ?? fallbackQuestion?.text;
    const rawLanguage = summaryEntry?.language ?? fallbackQuestion?.language ?? custom.language;
    const questionLanguage = typeof rawLanguage === 'string' ? rawLanguage : undefined;

    const answerCandidate =
      summaryEntry?.correctAnswer
      ?? (summaryEntry?.correctAnswers && summaryEntry.correctAnswers.length > 0
        ? summaryEntry.correctAnswers[0]
        : undefined)
      ?? fallbackQuestion?.correctAnswer
      ?? null;

    const showCorrectAnswers = custom.showCorrectAnswers ?? true;
    const showAnswerRecap = custom.summary?.showAnswerRecap ?? true;
    const answerRevealed = showCorrectAnswers && showAnswerRecap;
    const answerText = answerRevealed ? answerCandidate || '—' : 'Answer hidden';

    return {
      answerText,
      answerRevealed,
      questionText: questionText || undefined,
      questionLanguage,
    };
  }

  if (typeof custom === 'object' && 'items' in custom) {
    return { answerText: 'Pyramid', answerRevealed: true };
  }

  return { answerText: '—', answerRevealed: true };
}

function isTriviaConfig(config: DailyChallenge['custom']): config is TriviaConfig {
  return Boolean(config && typeof config === 'object' && 'questions' in config);
}

function isZoneRevealConfig(config: DailyChallenge['custom']): config is ZoneRevealConfig {
  return Boolean(config && typeof config === 'object' && 'answer' in config);
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

.calendar-item__answer.is-hidden {
  color: rgba(255, 255, 255, 0.45);
  font-style: italic;
}

.calendar-item__question {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.85);
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

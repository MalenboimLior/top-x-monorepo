<!-- Container page for the trivia game -->
<template>
  <div
    class="trivia-container"
    :class="{ 'is-rtl': isRtl }"
    :dir="direction"
    :style="themeStyles"
  >
    <video
      v-if="theme.backgroundVideoUrl"
      class="trivia-background-video"
      autoplay
      muted
      loop
      playsinline
    >
      <source :src="theme.backgroundVideoUrl" type="video/mp4" />
    </video>
    <div class="trivia-overlay" :style="overlayStyles"></div>

    <div class="trivia-content">
      <div v-if="error" class="notification is-danger">
        {{ error }}
      </div>

      <TriviaScene
        v-if="currentScreen !== 'gameover'"
        :screen="currentScreen"
        :mode="mode"
        :best-score="bestScore"
        :best-streak="bestStreak"
        :score="score"
        :streak="streak"
        :session-best-streak="sessionBestStreak"
        :lives="lives"
        :total-lives="configLives"
        :unlimited-lives="unlimitedLives"
        :current-question="currentQuestion"
        :selected-answer="selectedAnswer"
        :is-correct="isCorrect"
        :correct-answer-index="correctAnswerIndex"
        :is-reviewing-answer="isReviewingAnswer"
        :time-left="timeLeft"
        :question-timer-duration="questionTimerDuration"
        :global-time-left="globalTimeLeft"
        :power-ups="powerUps"
        :is-loading="isLoading"
        :question-number="currentQuestionNumber"
        :total-questions="totalQuestions"
        :show-correct-answers="showCorrectAnswers"
        :direction="direction"
        :inviter="inviter"
        :theme="theme"
        :language="language"
        @start-game="startGame"
        @answer-question="answerQuestion"
      />

      <TriviaEndScreen
        v-else
        :is-logged-in="isLoggedIn"
        :score="score"
        :best-score="bestScore"
        :session-best-streak="sessionBestStreak"
        :best-streak="bestStreak"
        :streak="streak"
        :attempt-count="attemptCount"
        :correct-attempt-count="correctAttemptCount"
        :theme="theme"
        :inviter="inviter"
        :leaderboard="leaderboard"
        :percentile-rank="percentileRank"
        :users-topped="usersTopped"
        :user-image="userImage"
        :share-url="shareUrl"
        :share-text="shareText"
        :language="language"
        :show-answer-summary="shouldShowAnswerSummary"
        :answer-summary="answerSummary"
        @play-again="resetGame"
        @share="shareScore"
        @login="login"
        @add-frenemy="addToFrenemies"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import { doc, getDoc } from 'firebase/firestore';
import TriviaScene from '@/components/games/trivia/TriviaScene.vue';
import TriviaEndScreen from '@/components/games/trivia/TriviaEndScreen.vue';
import { useTriviaStore } from '@/stores/trivia';
import { useUserStore } from '@/stores/user';
import { getUserPercentile } from '@/services/leaderboard';
import { db } from '@top-x/shared';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';

const triviaStore = useTriviaStore();
const userStore = useUserStore();
const route = useRoute();

useHead({
  title: 'Trivia Game - TOP-X',
  meta: [
    { name: 'description', content: 'Challenge yourself and your friends in the TOP-X Trivia game.' },
  ],
});

const DEFAULT_GAME_ID = 'smartest_on_x';
const initialGameId =
  typeof route.query.game === 'string' && route.query.game.trim().length > 0
    ? (route.query.game as string)
    : DEFAULT_GAME_ID;
const resolvedGameId = ref<string>(initialGameId);
const activeGameId = computed(() => resolvedGameId.value);

triviaStore.setGameId(resolvedGameId.value);

const initialChallengeId = typeof route.query.challenge === 'string'
  ? (route.query.challenge as string)
  : null;
const dailyChallengeId = ref<string | null>(initialChallengeId);
let challengeRequestId = 0;

async function loadDailyChallengeConfig(challengeId: string | null): Promise<void> {
  const requestId = ++challengeRequestId;
  if (!challengeId) {
    if (requestId === challengeRequestId) {
      await triviaStore.applyConfigOverride(null, { dailyChallengeId: null });
    }
    return;
  }

  try {
    const challengeRef = doc(
      db,
      'games',
      activeGameId.value,
      'daily_challenges',
      challengeId,
    );
    const snapshot = await getDoc(challengeRef);

    if (!snapshot.exists()) {
      console.warn('No trivia daily challenge found for id', challengeId);
      if (requestId === challengeRequestId) {
        await triviaStore.applyConfigOverride(null, { dailyChallengeId: null });
      }
      return;
    }

    const data = snapshot.data() as DailyChallenge;
    const config = (data.custom as TriviaConfig | undefined) ?? null;

    if (requestId === challengeRequestId) {
      await triviaStore.applyConfigOverride(config, { dailyChallengeId: challengeId });
    }
  } catch (error) {
    console.error('Failed to load trivia daily challenge:', error);
    if (requestId === challengeRequestId) {
      await triviaStore.applyConfigOverride(null, { dailyChallengeId: null });
    }
  }
}

watch(
  () => route.query.game,
  (nextGame) => {
    const normalized =
      typeof nextGame === 'string' && nextGame.trim().length > 0 ? (nextGame as string) : DEFAULT_GAME_ID;
    if (normalized !== resolvedGameId.value) {
      resolvedGameId.value = normalized;
      triviaStore.setGameId(normalized);
      void loadDailyChallengeConfig(dailyChallengeId.value);
    }
  }
);

watch(
  () => route.query.challenge,
  (nextChallenge) => {
    const normalized = typeof nextChallenge === 'string' && nextChallenge.length ? (nextChallenge as string) : null;
    if (normalized !== dailyChallengeId.value) {
      dailyChallengeId.value = normalized;
      void loadDailyChallengeConfig(normalized);
    }
  }
);

const currentScreen = computed(() => triviaStore.currentScreen);
const lives = computed(() => triviaStore.lives);
const score = computed(() => triviaStore.score);
const bestScore = computed(() => triviaStore.bestScore);
const bestStreak = computed(() => triviaStore.bestStreak);
const sessionBestStreak = computed(() => triviaStore.sessionBestStreak);
const currentQuestion = computed(() => triviaStore.currentQuestion);
const selectedAnswer = computed(() => triviaStore.selectedAnswer);
const isCorrect = computed(() => triviaStore.isCorrect);
const timeLeft = computed(() => triviaStore.timeLeft);
const questionTimerDuration = computed(() => triviaStore.questionTimerDuration);
const globalTimeLeft = computed(() => triviaStore.globalTimeLeft);
const streak = computed(() => triviaStore.streak);
const leaderboard = computed(() => triviaStore.leaderboard);
const isLoading = computed(() => triviaStore.isLoading);
const isLoggedIn = computed(() => !!userStore.user);
const userImage = computed(() => userStore.profile?.photoURL || 'https://via.placeholder.com/32');
const error = computed(() => userStore.error);
const inviter = computed(() => triviaStore.inviter);
const powerUps = computed(() => triviaStore.powerUps);
const attemptCount = computed(() => triviaStore.attemptCount);
const correctAttemptCount = computed(() => triviaStore.correctAttemptCount);
const currentQuestionNumber = computed(() => triviaStore.currentQuestionNumber);
const totalQuestions = computed(() => triviaStore.totalQuestions);
const mode = computed(() => triviaStore.mode);
const language = computed(() => triviaStore.language);
const showCorrectAnswers = computed(() => triviaStore.showCorrectAnswers);
const showCorrectAnswersOnEnd = computed(() => triviaStore.showCorrectAnswersOnEnd);
const correctAnswerIndex = computed(() => triviaStore.correctAnswerIndex);
const isReviewingAnswer = computed(() => triviaStore.isReviewingAnswer);
const answerSummary = computed(() => triviaStore.answerReview);
const shouldShowAnswerSummary = computed(
  () => showCorrectAnswersOnEnd.value && answerSummary.value.length > 0
);
const configLives = computed(() => triviaStore.configLives);
const unlimitedLives = computed(() => triviaStore.unlimitedLives);
const theme = computed(() => triviaStore.theme);

const rtlLangs = ['ar', 'he', 'fa', 'ur'];
const direction = computed(() => {
  const lang = language.value?.toLowerCase() ?? 'en';
  const base = lang.split('-')[0];
  return rtlLangs.includes(base) ? 'rtl' : 'ltr';
});
const isRtl = computed(() => direction.value === 'rtl');

const themeStyles = computed(() => {
  const styles: Record<string, string> = {
    '--trivia-primary': theme.value.primaryColor,
    '--trivia-secondary': theme.value.secondaryColor,
    '--trivia-background': theme.value.backgroundColor,
  };
  styles.backgroundColor = theme.value.backgroundColor;
  styles['--trivia-background-image'] = theme.value.backgroundImageUrl
    ? `url(${theme.value.backgroundImageUrl})`
    : 'none';
  return styles;
});

const overlayStyles = computed(() => ({
  background: theme.value.backgroundOverlayColor,
}));

const percentileRank = ref(0);
const usersTopped = ref(0);

const shareUrl = computed(() => {
  const params = new URLSearchParams();
  params.set('gameId', activeGameId.value);
  if (dailyChallengeId.value) {
    params.set('challenge', dailyChallengeId.value);
  }
  if (userStore.user) {
    params.set('inviterUid', userStore.user.uid);
    params.set('score', String(score.value));
  }
  const query = params.toString();
  return query ? `https://top-x.co/games/trivia?${query}` : 'https://top-x.co/games/trivia';
});

const shareText = computed(
  () => `I scored ${score.value} in the TOP-X Trivia challenge! Can you beat my streak of ${sessionBestStreak.value}?`
);

onMounted(() => {
  void loadDailyChallengeConfig(dailyChallengeId.value);
  const inviterUid = route.query.inviterUid as string;
  const routeGameId = route.query.gameId as string;
  const score = parseInt(route.query.score as string);
  if (inviterUid && routeGameId === activeGameId.value && !Number.isNaN(score)) {
    triviaStore.loadInviter(inviterUid, score);
  }
});

watch(
  () => currentScreen.value,
  async (newScreen) => {
    if (newScreen === 'gameover' && isLoggedIn.value && userStore.user?.uid) {
      try {
        const rankData = await getUserPercentile(activeGameId.value, {
          uid: userStore.user.uid,
          dailyChallengeId: triviaStore.dailyChallengeId ?? undefined,
        });
        percentileRank.value = rankData.percentile ?? 0;
        // Calculate users topped: if percentile is available, estimate based on total
        // For now, set to 0 as we don't have this data in the response
        usersTopped.value = 0;
      } catch (err) {
        console.error('Error fetching percentile rank:', err);
        percentileRank.value = 0;
        usersTopped.value = 0;
      }
    }
  }
);

const startGame = () => {
  triviaStore.startGame();
};

const answerQuestion = (index: number) => triviaStore.answerQuestion(index);

const resetGame = () => {
  triviaStore.resetGame();
  percentileRank.value = 0;
  usersTopped.value = 0;
};

const shareScore = () => {
  if (!userStore.user) {
    userStore.loginWithX();
    return;
  }
  const text = `${shareText.value} ${shareUrl.value}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(tweetUrl, '_blank');
};

const login = async () => {
  const success = await userStore.loginWithX();
  if (success) {
    await triviaStore.saveScoreAfterLogin();
  }
};

const addToFrenemies = async (uid: string) => {
  await userStore.addFrenemy(uid);
};
</script>

<style scoped>
@import '@/styles/Trivia.css';
</style>

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

      <TriviaSceneFixed
        v-if="mode === 'fixed' && currentScreen !== 'gameover'"
        :screen="currentScreen"
        :best-score="bestScore"
        :best-streak="bestStreak"
        :score="score"
        :streak="streak"
        :session-best-streak="sessionBestStreak"
        :lives="lives"
        :total-lives="configLives"
        :current-question="currentQuestion"
        :selected-answer="selectedAnswer"
        :is-correct="isCorrect"
        :correct-answer-index="correctAnswerIndex"
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

      <TriviaSceneEndless
        v-else-if="mode === 'endless' && currentScreen !== 'gameover'"
        :screen="currentScreen"
        :best-score="bestScore"
        :best-streak="bestStreak"
        :score="score"
        :streak="streak"
        :session-best-streak="sessionBestStreak"
        :lives="lives"
        :total-lives="configLives"
        :current-question="currentQuestion"
        :selected-answer="selectedAnswer"
        :is-correct="isCorrect"
        :correct-answer-index="correctAnswerIndex"
        :time-left="timeLeft"
        :question-timer-duration="questionTimerDuration"
        :global-time-left="globalTimeLeft"
        :power-ups="powerUps"
        :is-loading="isLoading"
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
import TriviaSceneEndless from '@/components/games/trivia/TriviaSceneEndless.vue';
import TriviaSceneFixed from '@/components/games/trivia/TriviaSceneFixed.vue';
import TriviaEndScreen from '@/components/games/trivia/TriviaEndScreen.vue';
import { useTriviaStore } from '@/stores/trivia';
import { useUserStore } from '@/stores/user';
import { getPercentileRank } from '@/services/leaderboard';

const triviaStore = useTriviaStore();
const userStore = useUserStore();
const route = useRoute();

useHead({
  title: 'Trivia Game - TOP-X',
  meta: [
    { name: 'description', content: 'Challenge yourself and your friends in the TOP-X Trivia game.' },
  ],
});

const gameId = 'smartest_on_x';

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
const configLives = computed(() => triviaStore.configLives);
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

const correctAnswerIndex = ref<number | null>(null);
const percentileRank = ref(0);
const usersTopped = ref(0);

const shareUrl = computed(() => {
  if (!userStore.user) {
    return 'https://top-x.co/games/trivia';
  }
  return `https://top-x.co/games/trivia?inviterUid=${userStore.user.uid}&gameId=${gameId}&score=${score.value}`;
});

const shareText = computed(
  () => `I scored ${score.value} in the TOP-X Trivia challenge! Can you beat my streak of ${sessionBestStreak.value}?`
);

onMounted(() => {
  const inviterUid = route.query.inviterUid as string;
  const routeGameId = route.query.gameId as string;
  const score = parseInt(route.query.score as string);
  if (inviterUid && routeGameId === gameId && !isNaN(score)) {
    triviaStore.loadInviter(inviterUid, score);
  }
});

watch(
  () => currentQuestion.value,
  async (newQuestion) => {
    correctAnswerIndex.value = null;
    if (!newQuestion || !newQuestion.correctHash) return;

    for (let i = 0; i < newQuestion.options.length; i++) {
      const hash = await triviaStore.hashAnswer(i);
      if (hash === newQuestion.correctHash) {
        correctAnswerIndex.value = i;
        break;
      }
    }
  },
  { immediate: true }
);

watch(
  () => currentScreen.value,
  async (newScreen) => {
    if (newScreen === 'gameover' && isLoggedIn.value && userStore.user?.uid) {
      try {
        const rankData = await getPercentileRank(gameId, userStore.user.uid);
        percentileRank.value = rankData.percentile;
        usersTopped.value = rankData.usersTopped || 0;
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

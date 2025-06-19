<!-- Container page for the trivia game -->
<template>
  <div class="trivia-container">
    <div v-if="error" class="notification is-danger">
      {{ error }}
    </div>

    <div class="hud">
      <div class="hud-item">
        <span class="label">Score: {{ score }}</span>
      </div>
      <div class="hud-item">
        <span class="label">Best: {{ bestScore }}</span>
      </div>
      <div class="hud-item" :class="{ 'streak-glow': streakIncreased }">
        <span class="label">Streak: {{ streak }}</span>
      </div>
      <div v-if="isLoggedIn" class="hud-item">
        <figure class="image is-32x32">
          <img :src="userImage" alt="User image" class="is-rounded" />
        </figure>
      </div>
    </div>

    <StartTrivia
      v-if="currentScreen === 'start'"
      :best-score="bestScore"
      :best-streak="bestStreak"
      :inviter="inviter"
      @start-game="startGame"
    />

    <TriviaGame
      v-else-if="currentScreen === 'playing'"
      :lives="lives"
      :time-left="timeLeft"
      :current-question="currentQuestion"
      :selected-answer="selectedAnswer"
      :is-correct="isCorrect"
      :correct-answer-index="correctAnswerIndex"
      :is-loading="isLoading"
      @answer-question="answerQuestion"
    />

    <div v-else>
      <EndScreenLoggedIn
        v-if="isLoggedIn"
        :score="score"
        :best-score="bestScore"
        :session-best-streak="sessionBestStreak"
        :best-streak="bestStreak"
        :percentile-rank="percentileRank"
        :users-topped="usersTopped"
        :user-image="userImage"
        :inviter="inviter"
        :leaderboard="leaderboard"
        @reset-game="resetGame"
        @add-to-rivals="addToRivals"
      />
      <EndScreenLoggedOut
        v-else
        :score="score"
        :best-score="bestScore"
        :session-best-streak="sessionBestStreak"
        :best-streak="bestStreak"
        :inviter="inviter"
        @reset-game="resetGame"
        @share-score="shareScore"
        @login="login"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTriviaStore } from '@/stores/trivia';
import { useUserStore } from '@/stores/user';
import { computed, watch, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import StartTrivia from '@/components/StartTrivia.vue';
import TriviaGame from '@/components/TriviaGame.vue';
import EndScreenLoggedIn from '@/components/EndScreenLoggedIn.vue';
import EndScreenLoggedOut from '@/components/EndScreenLoggedOut.vue';
import { getPercentileRank } from '@/services/trivia';

const triviaStore = useTriviaStore();
const userStore = useUserStore();
const route = useRoute();

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
const streak = computed(() => triviaStore.streak);
const leaderboard = computed(() => triviaStore.leaderboard);
const isLoading = computed(() => triviaStore.isLoading);
const isLoggedIn = computed(() => !!userStore.user);
const userImage = computed(() => userStore.profile?.photoURL || 'https://via.placeholder.com/32');
const error = computed(() => userStore.error);
const inviter = computed(() => triviaStore.inviter);

const streakIncreased = ref(false);
const correctAnswerIndex = ref<number | null>(null);
const percentileRank = ref(0);
const usersTopped = ref(0);

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
        console.log('Correct answer index set:', i);
        break;
      }
    }
  },
  { immediate: true }
);

watch(
  () => triviaStore.streak,
  (newStreak, oldStreak) => {
    if (newStreak > oldStreak) {
      streakIncreased.value = true;
      setTimeout(() => {
        streakIncreased.value = false;
      }, 500);
    }
  }
);

watch(
  () => currentScreen.value,
  async (newScreen) => {
    if (newScreen === 'gameover' && isLoggedIn.value && userStore.user?.uid) {
      try {
        const rankData = await getPercentileRank(gameId, userStore.user.uid);
        percentileRank.value = rankData.percentile;
        usersTopped.value = rankData.usersTopped || 0;
        console.log('Percentile rank fetched:', percentileRank.value, 'Users topped:', usersTopped.value);
      } catch (err) {
        console.error('Error fetching percentile rank:', err);
        percentileRank.value = 0;
        usersTopped.value = 0;
      }
    }
  }
);

const startGame = () => {
  console.log('Start game clicked for gameId:', gameId);
  triviaStore.startGame();
};

const answerQuestion = (index: number) => triviaStore.answerQuestion(index);

const resetGame = () => {
  console.log('Reset game clicked');
  triviaStore.resetGame();
  percentileRank.value = 0;
  usersTopped.value = 0;
};

const shareScore = () => {
  console.log('Share score clicked, isLoggedIn:', isLoggedIn.value);
  if (!userStore.user) {
    console.log('User not logged in, prompting login');
    userStore.loginWithX();
    return;
  }
  const text = `I scored ${score.value} in the Trivia Game on TOP-X! Can you beat me?`;
  const url = `https://top-x.co/games/trivia?inviterUid=${userStore.user.uid}&gameId=${gameId}&score=${score.value}`;
  const shareText = `${text} ${url}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  window.open(tweetUrl, '_blank');
  console.log('Sharing score on X:', score.value, 'streak:', sessionBestStreak.value, 'url:', url);
};

const login = async () => {
  console.log('Login with X clicked');
  const success = await userStore.loginWithX();
  if (success) {
    console.log('Login successful, saving score');
    await triviaStore.saveScoreAfterLogin();
  } else {
    console.log('Login failed');
  }
};

const addToRivals = async (uid: string) => {
  console.log('Add to rivals clicked for UID:', uid);
  await userStore.addRival(uid);
};
</script>

<style scoped>
@import '@/styles/Trivia.css';
</style>
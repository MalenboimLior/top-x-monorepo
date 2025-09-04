<!-- Updated GameInfo.vue -->
<template>
  <div class="game-info-container">
    <!-- Section 1: Game Info -->
    <section class="game-info-section">
      <img :src="game.image" :alt="`${game.name} image`" class="game-image" />
      <h1 class="title has-text-white">{{ game.name }}</h1>
      <p class="subtitle has-text-grey-light">{{ game.description }}</p>
      <p v-if="game.gameHeader" class="has-text-white"><strong>Header:</strong> {{ game.gameHeader }}</p>
      <p v-if="game.gameInstruction" class="has-text-white"><strong>Instructions:</strong> {{ game.gameInstruction }}</p>
      <p class="has-text-white"><strong>Game Type:</strong> {{ game.gameTypeId }}</p>
      <!-- Add more fields as needed in the future -->
    </section>

    <!-- Section 2: Action Buttons -->
    <section class="action-buttons-section">
      <CustomButton
        type="is-primary is-large"
        label="Play Now"
        @click="playGame"
      />
      <CustomButton
        type="is-secondary mt-4"
        label="Back to Games"
        @click="backToGames"
      />
    </section>

    <!-- Section 3: Leaderboard -->
    <section class="leaderboard-section">
      <h2 class="title is-3 has-text-white">Leaderboard</h2>
      <Leaderboard :game-id="gameId" />
    </section>

    <!-- Section 4: Daily Challenges -->
    <section v-if="game.dailyChallengeActive" class="daily-challenges-section">
      <h2 class="title is-3 has-text-white">Daily Challenges</h2>
      <!-- Assuming DailyChallenges component can accept gameId prop; adjust if needed -->
      <DailyChallenges :gameId="gameId" />
    </section>

    <!-- Section 5: Build Your Own Game -->
    <section class="build-section">
      <CustomButton
        type="is-info mt-4"
        label="Build Your Own Game"
        @click="buildGame"
      />
      <span class="has-text-grey-light ml-2">(only for registered users)</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import DailyChallenges from '@/views/DailyChallenges.vue';
import { useUserStore } from '@/stores/user';
import { Game } from '@top-x/shared/types/game';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import fallbackImg from '@/assets/images/fallback.png';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameId = ref(route.query.game as string);
const game = ref<Game>({
  id: '',
  name: '',
  description: '',
  gameTypeId: '',
  active: true,
  image: '',
  vip: [],
  custom: {} as any,
  language: 'en',
});

onMounted(async () => {
  if (!gameId.value) {
    console.error('GameInfo: No gameId provided');
    router.push('/');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId.value);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const data = gameDoc.data();
      game.value = {
        id: gameDoc.id,
        name: data.name || 'Unnamed Game',
        description: data.description || 'No description available',
        gameTypeId: data.gameTypeId || '',
        gameHeader: data.gameHeader,
        gameInstruction: data.gameInstruction,
        image: data.image || fallbackImg,
        active: data.active ?? true,
        language: data.language || 'en',
        shareLink: data.shareLink,
        dailyChallengeActive: data.dailyChallengeActive,
        // Add other fields as needed
      } as Game;
      console.log('GameInfo: Game data fetched:', game.value);

      if (analytics) {
        logEvent(analytics, 'page_view', { page_name: 'game_info', game_id: gameId.value });
      }
    } else {
      console.error('GameInfo: Game document not found for ID:', gameId.value);
      router.push('/');
    }
  } catch (error: any) {
    console.error('GameInfo: Error fetching game data:', error.message, error);
  }
});

function playGame() {
  const trackGameId = gameId.value || 'unknown';
  if (analytics) {
    logEvent(analytics, 'select_game', { game_id: trackGameId });
  }
  router.push(`/games/${game.value.gameTypeId}?game=${gameId.value}`);
}

function backToGames() {
  router.push('/');
}

function buildGame() {
  if (!userStore.user) {
    // Optionally prompt login or show message
    alert('Please log in to build your own game.');
    return;
  }
  router.push(`/build?type=${game.value.gameTypeId}`);
}
</script>

<style scoped>
.game-info-container {
  padding: 20px;
}

.game-info-section {
  text-align: center;
}

.game-image {
  max-width: 300px;
  height: auto;
  border-radius: 8px;
}

.action-buttons-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.leaderboard-section,
.daily-challenges-section,
.build-section {
  margin-top: 40px;
}
</style>
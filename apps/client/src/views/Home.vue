<!-- Home.vue -->
<template>
  <div class="home-container">
    <img
      src="../assets/topx-logo.png"
      alt="TOP-X"
      class="title has-text-white"
      style="max-width: 200px; height: auto;"
    >
    <p class="subtitle has-text-grey-light">Play, compete, and share with friends!</p>

    <div class="field">
      <label class="label has-text-white">Filter by Language</label>
      <div class="control">
        <div class="select">
          <select v-model="selectedLanguage">
            <option value="">All</option>
            <option value="en">English</option>
            <option value="il">Hebrew</option>
          </select>
        </div>
      </div>
    </div>

    <h2 class="title is-3 has-text-white">TOP-X Games</h2>
    <div class="columns is-multiline is-mobile">
      <div v-for="game in filteredAdminGames" :key="game.id" class="column is-half-desktop is-half-tablet is-full-mobile is-clickable" @click="navigateToGame(game.id, game.gameTypeId)">
        <Card>
          <div class="card-image">
            <figure class="image is-4by3">
              <img :src="game.image" :alt="`${game.name} image`" />
            </figure>
          </div>
          <div class="card-content">
            <h2 class="title is-4 has-text-white">{{ game.name }}</h2>
            <p class="has-text-grey-light">{{ game.description }}</p>
            <CustomButton
              type="is-primary mt-4"
              :label="'Play Now'"
            />
          </div>
        </Card>
      </div>
    </div>

    <h2 class="title is-3 has-text-white mt-6">Community Games</h2>
    <div class="columns is-multiline is-mobile">
      <div v-for="game in filteredCommunityGames" :key="game.id" class="column is-half-desktop is-half-tablet is-full-mobile is-clickable" @click="navigateToGame(game.id, game.gameTypeId)">
        <Card>
          <div class="card-image">
            <figure class="image is-4by3">
              <img :src="game.image" :alt="`${game.name} image`" />
            </figure>
          </div>
          <div class="card-content">
            <h2 class="title is-4 has-text-white">{{ game.name }}</h2>
            <p class="has-text-grey-light">{{ game.description }}</p>
            <p class="has-text-grey-light">Created by: {{ game.creator?.username || 'Unknown' }}</p>
            <CustomButton
              type="is-primary mt-4"
              :label="'Play Now'"
            />
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import fallbackImg from '@/assets/images/fallback.png';
import { analytics, trackEvent } from '@top-x/shared';
import { Game } from '@top-x/shared/types/game';

const router = useRouter();

const games = ref<Game[]>([]);
const selectedLanguage = ref('');

function changeLayout(language: string) {
  const direction = language === 'il' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.body.setAttribute('dir', direction);
}

useHead({
  title: 'TOP-X',
  meta: [
    {
      name: 'description',
      content: 'Play fun social games and compete with friends on TOP-X.',
    },
  ],
});

onMounted(() => {
  console.log('Home: Fetching games from Firestore...');
  trackEvent(analytics, 'page_view', { page_name: 'home' });
  const q = query(collection(db, 'games'));
  onSnapshot(q, (snapshot) => {
    games.value = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('Home: Game fetched:', { id: doc.id, data });
      return {
        id: doc.id,
        name: data.name || 'Unnamed Game',
        description: data.description || 'No description available',
        gameTypeId: data.gameTypeId || '',
        image: data.image || fallbackImg,
        active: data.active ?? false,
        language: data.language || 'en',
        shareLink: data.shareLink || '',
        community: data.community ?? false,
        creator: data.creator,
        gameHeader: data.gameHeader,
        gameInstruction: data.gameInstruction,
        vip: data.vip || [],
        custom: data.custom || {},
      } as Game;
    }).filter(g => g.active);
    console.log('Home: Games updated:', games.value);
  }, (err) => {
    console.error('Home: Error fetching games:', err.message, err);
  });
  changeLayout(selectedLanguage.value);
});

watch(selectedLanguage, (language) => {
  changeLayout(language);
});

const filteredAdminGames = computed(() => {
  return games.value.filter(g => !g.community && (!selectedLanguage.value || g.language === selectedLanguage.value));
});

const filteredCommunityGames = computed(() => {
  return games.value.filter(g => g.community && (!selectedLanguage.value || g.language === selectedLanguage.value));
});

function navigateToGame(gameId: string, gameTypeId: string) {
  trackEvent(analytics, 'select_game', { game_id: gameId });
  router.push(`/games/info?game=${gameId}`);
}
</script>

<style scoped>
@import '../styles/Home.css';
.is-clickable {
  cursor: pointer;
}
</style>
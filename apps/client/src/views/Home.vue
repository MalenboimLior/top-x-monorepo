
<!-- Landing page listing available games -->
<template>
  <div class="home-container">
    <img
      src="../assets/topx-logo.png"
      alt="TOP-X"
      class="title has-text-white"
      style="max-width: 200px; height: auto;"
    >
    <p class="subtitle has-text-grey-light">Play, compete, and share with friends!</p>
    <div class="columns is-multiline is-mobile">
      <div v-for="game in games" :key="game.id" class="column is-half-desktop is-half-tablet is-full-mobile" :class="{ 'is-clickable': !game.isComingSoon }" @click="!game.isComingSoon ? navigateToGame(game.route) : null">
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
              v-if="!game.isComingSoon"
              type="is-primary mt-4"
              :label="'Play Now'"
            />
            <CustomButton
              v-else
              type="is-disabled mt-4"
              label="Coming Soon"
              :disabled="true"
            />
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import fallbackImg from '@/assets/images/fallback.png';

const router = useRouter();

interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  image: string;
  isComingSoon: boolean;
  active: boolean;
  language: 'en' | 'il';
  shareLink?: string;
  route: string;
}

const games = ref<Game[]>([]);

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
        isComingSoon: data.custom?.isComingSoon || false,
        active: data.active ?? false,
        language: data.language || 'en',
        shareLink: data.shareLink || '',
        route: data.gameTypeId === 'PyramidTier' ? `/games/PyramidTier?game=${doc.id}` : `/games/${data.gameTypeId}`,
      } as Game;
    }).filter(g => g.active);
    console.log('Home: Games updated:', games.value);
  }, (err) => {
    console.error('Home: Error fetching games:', err.message, err);
  });
});

function navigateToGame(route: string) {
  router.push(route);
}
</script>

<style scoped>
@import '../styles/Home.css';
.is-clickable {
  cursor: pointer;
}
</style>
<!-- Landing page listing available games -->
<template>
  <div class="home-container">
    <img
      src="../assets/topx-logo.png"
      alt="TOP-X Games"
      class="title has-text-white"
      style="max-width: 200px; height: auto;"
    >
    <p class="subtitle has-text-grey-light">Play, compete, and share with friends!</p>
    <div class="columns is-multiline is-mobile">
      <div v-for="game in games" :key="game.id" class="column is-half-desktop is-half-tablet is-full-mobile">
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
              @click="$router.push(game.route)"
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
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import fallbackImg from '@/assets/images/fallback.png';

interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  image: string;
  isComingSoon: boolean;
  route: string;
}

const games = ref<Game[]>([]);

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
        image: data.custom?.image || fallbackImg,
        isComingSoon: data.custom?.isComingSoon || false,
        route: data.gameTypeId === 'PyramidTier' ? `/games/PyramidTier?game=${doc.id}` : `/games/${data.gameTypeId}`,
      };
    });
    console.log('Home: Games updated:', games.value);
  }, (err) => {
    console.error('Home: Error fetching games:', err.message, err);
  });
});
</script>

<style scoped>
@import '../styles/Home.css';
</style>
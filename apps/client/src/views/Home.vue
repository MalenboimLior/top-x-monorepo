<template>
  <div class="home-container">
    <!-- <h1 class="title has-text-white">TOP-X Games</h1> -->
<img
  src="../assets/topx-logo.png"
  alt="TOP-X Games"
  class="title has-text-white"
  style="max-width: 200px; height: auto;"
>
    <p class="subtitle has-text-grey-light">Play, compete, and share with friends!</p>
    <div class="columns is-multiline is-mobile">
      <div v-for="game in games" :key="game.id" class="column is-one-third-desktop is-half-tablet is-full-mobile">
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
import { ref } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import triviaImg from '@/assets/trivia.jpg';
import comingSoonImg from '@/assets/coming-soon.jpg';

interface Game {
  id: string;
  name: string;
  description: string;
  image: string;
  isComingSoon: boolean;
  route: string;
}

const games = ref<Game[]>([
  {
    id: 'trivia',
    name: 'Trivia Game',
    description: 'Test your knowledge with fun trivia questions.',
    image: triviaImg,
    isComingSoon: false,
    route: '/games/trivia',
  },
  {
    id: 'game2',
    name: 'Game 2',
    description: 'Coming soon...',
    image: comingSoonImg,
    isComingSoon: true,
    route: '',
  },
  {
    id: 'game3',
    name: 'Game 3',
    description: 'Coming soon...',
    image: comingSoonImg,
    isComingSoon: true,
    route: '',
  },
]);
</script>

<style scoped>
@import '../styles/Home.css';
</style>
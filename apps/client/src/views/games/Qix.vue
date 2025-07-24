<!-- src/views/games/Qix.vue (or components/games/QixGame.vue) -->
<template>
  <div ref="gameContainer" class="game-container"></div>
  <!-- <div v-if="!user" class="notification is-warning">
    Please log in to play and save scores.
  </div> -->
  <button class="button is-primary" @click="startGame" >Start Game</button>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Phaser from 'phaser';
import { QixScene } from '@/components/games/QixScene'; // Import scene
import { useUserStore } from '@/stores/user'; // Pinia user store
//import { useTriviaStore } from '@/stores/trivia'; // Example, adapt if needed
import { db } from '@top-x/shared';

import { doc, setDoc } from 'firebase/firestore'; // vuefire implied
import {  Game } from '@top-x/shared/types'; // Shared types

const gameContainer = ref<HTMLDivElement | null>(null);
const userStore = useUserStore();
//const user = ref<User | null>(userStore.user); // Auth check
let game: Phaser.Game | null = null;

const gameSlug = 'qix'; // For Firebase paths

onMounted(() => {
  initPhaser();
});

onBeforeUnmount(() => {
  if (game) {
    game.destroy(true);
    game = null;
  }
});

const initPhaser = () => {
  if (!gameContainer.value) return;

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameContainer.value,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [QixScene],
    physics: {
      default: 'arcade',
      arcade: { debug: false } // Low-resource
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: { disableWebAudio: false } // Mobile compat
  });

  // Listen for game events (e.g., score sync)
  game.scene.getScene('QixScene').events.on('updateScore', syncScore);
};

const startGame = () => {
  if (game) game.scene.start('QixScene');
};

const syncScore = async () => {
  // if (!user.value) return;
  // const scene = game?.scene.getScene('QixScene') as QixScene;
  // if (!scene) return;

  // const gameData: Partial<Game> = {
  //   score: scene.score,
  //   completed: scene.capturedArea / scene.totalArea >= 0.75 // Win flag
  // };

  // // Sync to Firebase (users/{userId}/games/qix)
  // const userGameRef = doc(db, `users/${user.value.id}/games/${gameSlug}`);
  // await setDoc(userGameRef, gameData, { merge: true });

  // // Leaderboards (separate collection)
  // const leaderboardRef = doc(db, `leaderboards/${gameSlug}/scores/${user.value.id}`);
  // await setDoc(leaderboardRef, { score: scene.score, userId: user.value.id }, { merge: true });
};
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
  background-color: #0d1117; /* Dark theme */
}
.button {
  background-color: #1f6feb; /* Bulma primary */
  color: #ffffff;
}
</style>

<!-- Comments for extensions:
- Add auth guard in router: beforeEnter check userStore.isAuthenticated
- Integrate Pinia for local state: e.g., useTriviaStore for game-specific if adapted
- Mobile: Add touch controls overlay if needed
- Vibe: Keep simple, iterate on enemy AI/capture logic
-->
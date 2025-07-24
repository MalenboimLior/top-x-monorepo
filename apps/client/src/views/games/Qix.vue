<!-- src/views/games/Qix.vue -->
<template>
  <div ref="gameContainer" class="game-container"></div>
  <button class="button is-primary" @click="startGame">Start Game</button>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Phaser from 'phaser';
import { QixScene } from '@/components/games/QixScene'; // Import scene
import { useUserStore } from '@/stores/user'; // Pinia user store (optional, commented)
import { db } from '@top-x/shared';
import { doc, setDoc } from 'firebase/firestore';
import { Game } from '@top-x/shared/types';

const gameContainer = ref<HTMLDivElement | null>(null);
// const userStore = useUserStore(); // Uncomment for auth
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

  // Wait for game 'ready' event before accessing scenes (fixes null getScene)
  game.events.on('ready', () => {
    // Listen for game events (e.g., score sync); currently empty, but ready for use
    game!.scene.getScene('QixScene').events.on('updateScore', syncScore);
  });
};

const startGame = () => {
  if (game) game.scene.start('QixScene');
};

const syncScore = async () => {
  // Uncomment for Firebase sync once user auth reinstated
  // if (!userStore.user) return;
  // const scene = game?.scene.getScene('QixScene') as QixScene;
  // if (!scene) return;
  // const gameData: Partial<Game> = {
  //   score: scene.score,
  //   completed: scene.capturedArea / scene.totalArea >= 0.75
  // };
  // const userGameRef = doc(db, `users/${userStore.user.id}/games/${gameSlug}`);
  // await setDoc(userGameRef, gameData, { merge: true });
  // const leaderboardRef = doc(db, `leaderboards/${gameSlug}/scores/${userStore.user.id}`);
  // await setDoc(leaderboardRef, { score: scene.score, userId: userStore.user.id }, { merge: true });
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
- Create assets in src/assets/games/qix/ to fix load/404/JSON errors (use placeholders like 1x1 PNGs for testing)
- Re-add user auth: Uncomment userStore, add v-if="!userStore.user" notification
- Mobile: Audio resumes on first touch/click (e.g., startGame button)
- Vibe: Now runs with placeholders; iterate on enemy AI, add particles for captures
-->
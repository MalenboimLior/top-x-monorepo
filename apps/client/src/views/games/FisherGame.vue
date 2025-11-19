<!-- apps/client/src/views/games/FisherGame.vue -->
<template>
  <div class="game-wrapper">
    <div class="game-header">
      <button class="x-btn x-back" @click="goBack" aria-label="Back">
        <svg class="icon"><use href="#ic-chevron-left" xlink:href="#ic-chevron-left"/></svg>
      </button>
      <h2 class="subtitle has-text-success">Fisher Game</h2>
      <div class="header-spacer" aria-hidden="true"></div>
    </div>

    <div ref="phaserContainer" class="phaser-container" />

    <FisherGameEndScreen
      v-if="showEndScreen"
      :score="finalScore"
      @close="restartGame"
      @login="handleLogin"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import FisherGameEndScreen from '@/components/games/FisherGame/FisherGameEndScreen.vue';
import createFisherGameScene from '@/components/games/FisherGame/FisherGameScene';

const phaserContainer = ref<HTMLDivElement | null>(null);
const showEndScreen = ref(false);
const finalScore = ref(0);
const router = useRouter();

let Phaser: any;
let game: any;
let sceneInstance: any;

useHead({
  title: 'TOP-X: Fisher Game',
  meta: [
    {
      name: 'description',
      content: 'Play Fisher Game on TOP-X: Catch fish, avoid obstacles, and compete for the top score!',
    },
  ],
});

onMounted(async () => {
  if (!phaserContainer.value) return;

  Phaser = await import('phaser');

  // 1. Get the scene class
  const FisherScene = createFisherGameScene(Phaser);

  // 2. Create the game
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    parent: phaserContainer.value,
    physics: { default: 'arcade' },
    scene: FisherScene,
  });

  // 3. Wait for scene to be fully added & started
  await nextTick(); // DOM ready
  await new Promise(resolve => {
    const check = () => {
      sceneInstance = game.scene.getScene('FisherScene');
      if (sceneInstance && sceneInstance.sys && sceneInstance.sys.isActive()) {
        resolve(undefined);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });

  // 4. Safe event listener
  sceneInstance.events.on('gameover', (score: number) => {
    finalScore.value = score;
    showEndScreen.value = true;
  });
});

onUnmounted(() => {
  game?.destroy(true);
});

const restartGame = () => {
  showEndScreen.value = false;
  sceneInstance?.scene.restart();
};

const goBack = () => router.back();
const handleLogin = () => {
  // TODO: implement X login
};
</script>
<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  overflow: hidden;
}
.game-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #111;
  color: #0ff;
  font-weight: 600;
}
.phaser-container {
  flex: 1;
  position: relative;
  background: #001;
}
.phaser-container canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
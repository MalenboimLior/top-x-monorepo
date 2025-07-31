<template>
  <div class="game-wrapper">
    <div ref="phaserContainer" class="phaser-container" />
    <div class="controls">
      <div class="row">
        <button @click="setDirection('up')">⬆️</button>
      </div>
      <div class="row">
        <button @click="setDirection('left')">⬅️</button>
        <button @click="setDirection('down')">⬇️</button>
        <button @click="setDirection('right')">➡️</button>
      </div>
      <div class="actions">
  <button @click="togglePause">⏸️ Pause / ▶️ Resume</button>
  <button @click="restartGame">🔄 Restart</button>
</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@top-x/shared'
import Phaser from 'phaser'
import ZoneRevealScene, { WIDTH, HEIGHT } from '@/components/games/ZoneRevealScene'
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal'

const phaserContainer = ref<HTMLDivElement | null>(null)
let game: Phaser.Game | null = null
const route = useRoute()
const zoneRevealConfig = ref<ZoneRevealConfig | null>(null)

onMounted(async () => {
  if (!phaserContainer.value) return

  const gameId = (route.query.game as string)?.toLowerCase()
  if (gameId) {
    try {
      const snap = await getDoc(doc(db, 'games', gameId))
      if (snap.exists()) {
        zoneRevealConfig.value = snap.data().custom as ZoneRevealConfig
      }
    } catch (err) {
      console.error('Failed fetching zone reveal config:', err)
    }
  }

  const scene = new ZoneRevealScene(zoneRevealConfig.value || undefined)
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#222',
    parent: phaserContainer.value,
    physics: {
      default: 'arcade',
      arcade: {
        //  debug: true  // Enable to see physics bodies
      }
    },
    scene
  })
})

onBeforeUnmount(() => {
  if (game) {
    game.destroy(true)
    game = null
  }
})
function setDirection(dir: 'up' | 'down' | 'left' | 'right') {
  window.dispatchEvent(new CustomEvent('setDirection', { detail: dir }));
}


function togglePause() {
  window.dispatchEvent(new Event('togglePause'));
}

function restartGame() {
  window.dispatchEvent(new Event('restartGame'));
}
</script>

<style scoped>
.game-wrapper {
  max-width: 100vw;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.phaser-container {
  width: 100%;
  max-width: 500px;
  border: 2px solid #333;
  box-sizing: border-box;
}
.actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.controls {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.row {
  display: flex;
  gap: 10px;
  margin: 5px 0;
}

button {
  font-size: 24px;
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  background-color: #555;
  color: white;
}
button:active {
  background-color: #888;
}
</style>

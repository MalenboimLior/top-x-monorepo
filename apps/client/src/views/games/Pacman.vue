<template>
  <div class="game-wrapper">
    <div class="hud">
      <div class="hud-card">
        <span class="label">Score</span>
        <span class="value">{{ score }}</span>
      </div>
      <div class="hud-card">
        <span class="label">Lives</span>
        <span class="value">{{ lives }}</span>
      </div>
      <div class="hud-card">
        <span class="label">Level</span>
        <span class="value">{{ level }}</span>
      </div>
      <div class="hud-card">
        <span class="label">Pellets</span>
        <span class="value">{{ pelletsRemaining }}</span>
      </div>
    </div>
    <div ref="phaserContainer" class="game-canvas"></div>
    <div class="controls" :class="{ 'is-disabled': showEndScreen }">
      <div class="dpad">
        <button class="arrow" aria-label="up" @click="setDirection('up')">▲</button>
        <div class="mid">
          <button class="arrow" aria-label="left" @click="setDirection('left')">◀</button>
          <button class="arrow" aria-label="down" @click="setDirection('down')">▼</button>
          <button class="arrow" aria-label="right" @click="setDirection('right')">▶</button>
        </div>
      </div>
      <div class="actions">
        <button class="button is-info" type="button" @click="togglePause">
          {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        <button class="button is-warning" type="button" @click="restartGame">Restart</button>
      </div>
    </div>
    <PacmanEndScreen
      v-if="showEndScreen"
      :score="endScreenScore"
      :game-id="gameId"
      :total-time="endScreenMeta.totalTime"
      :meta="endScreenMeta.meta"
      @close="handleEndScreenClose"
      @mounted="handleEndScreenMounted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'
import PacmanEndScreen from '@/components/games/pacman/PacmanEndScreen.vue'
import type { PacmanConfig } from '@top-x/shared/types/pacman'
import { db } from '@top-x/shared'
import { doc, getDoc } from 'firebase/firestore'
import { useUserStore } from '@/stores/user'
import { analytics } from '@top-x/shared'
import { logEvent } from 'firebase/analytics'

const route = useRoute()
const userStore = useUserStore()

type PhaserNamespace = typeof import('phaser')
type PacmanSceneModule = typeof import('@/components/games/pacman/PacmanScene')
type PacmanSceneFactory = PacmanSceneModule['default']
type PacmanSceneInstance = ReturnType<PacmanSceneFactory>
type PhaserGame = import('phaser').Game

let PhaserLib: PhaserNamespace | null = null
let pacmanSceneFactory: PacmanSceneFactory | null = null
let sceneWidth = 0
let sceneHeight = 0
let game: PhaserGame | null = null

const phaserContainer = ref<HTMLDivElement | null>(null)
const gameId = ref((route.query.game as string) || 'PacmanDemo')
const gameTitle = ref('Pacman Demo')
const gameDescription = ref('Chomp pellets, dodge ghosts, and chase the top score!')
const pacmanConfig = ref<PacmanConfig | null>(null)

const score = ref(0)
const lives = ref(0)
const level = ref(1)
const pelletsRemaining = ref(0)
const isPaused = ref(false)

const showEndScreen = ref(false)
const endScreenScore = ref(0)
const endScreenMeta = ref<{ totalTime: number; meta: { victory?: boolean; levelReached?: number } | null}>(
  { totalTime: 0, meta: null }
)

useHead(() => ({
  title: `TOP-X: ${gameTitle.value || 'Pacman'}`,
  meta: [
    {
      name: 'description',
      content:
        gameDescription.value ||
        'Play Pacman on TOP-X: weave through mazes, collect pellets, and outsmart playful ghosts.'
    }
  ]
}))

onMounted(async () => {
  hideChrome()
  window.addEventListener('gameStart', hideChrome)
  window.addEventListener('gameOver', handleGameOver)
  window.addEventListener('pacmanState', handlePacmanState)
  window.addEventListener('keydown', onKeyDown)

  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value, view_type: 'play' })
  }

  if (gameId.value && gameId.value !== 'PacmanDemo') {
    await loadRemoteConfig(gameId.value)
  }

  if (!phaserContainer.value) {
    console.error('Pacman: Missing container element')
    return
  }

  if (!PhaserLib || !pacmanSceneFactory) {
    const [{ default: Phaser }, sceneModule] = await Promise.all([
      import('phaser'),
      import('@/components/games/pacman/PacmanScene')
    ])
    PhaserLib = Phaser
    pacmanSceneFactory = sceneModule.default as PacmanSceneFactory
    sceneWidth = sceneModule.WIDTH
    sceneHeight = sceneModule.HEIGHT
  }

  if (!PhaserLib || !pacmanSceneFactory) {
    console.error('Pacman: Failed to load Phaser or scene factory')
    return
  }

  const scene: PacmanSceneInstance = pacmanSceneFactory(PhaserLib, pacmanConfig.value || undefined)
  const containerWidth = phaserContainer.value.clientWidth || sceneWidth
  const containerHeight = phaserContainer.value.clientHeight || sceneHeight
  const zoomX = containerWidth / sceneWidth
  const zoomY = containerHeight / sceneHeight
  const zoom = Math.max(1, Math.min(3, Math.min(zoomX, zoomY)))

  game = new PhaserLib.Game({
    type: PhaserLib.AUTO,
    width: sceneWidth,
    height: sceneHeight,
    backgroundColor: '#000',
    parent: phaserContainer.value,
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: {
      mode: PhaserLib.Scale.FIT,
      autoCenter: PhaserLib.Scale.CENTER_BOTH,
      width: sceneWidth,
      height: sceneHeight,
      zoom
    },
    scene
  })
})

onBeforeUnmount(() => {
  if (game) {
    game.destroy(true)
    game = null
  }
  window.removeEventListener('gameOver', handleGameOver)
  window.removeEventListener('pacmanState', handlePacmanState)
  window.removeEventListener('gameStart', hideChrome)
  window.removeEventListener('keydown', onKeyDown)
  showChrome()
})

async function loadRemoteConfig(id: string) {
  try {
    const gameDoc = await getDoc(doc(db, 'games', id))
    if (gameDoc.exists()) {
      const data = gameDoc.data()
      gameTitle.value = data.name || gameTitle.value
      gameDescription.value = data.description || gameDescription.value
      pacmanConfig.value = data.custom as PacmanConfig
    } else {
      console.warn('Pacman: Game document not found for ID:', id)
    }
  } catch (err) {
    console.error('Pacman: Failed to load config', err)
  }
}

function handleGameOver(event: Event) {
  const detail = (event as CustomEvent<{ score: number; totalTime: number; meta?: { victory?: boolean; levelReached?: number } }>).detail
  if (!detail) return

  endScreenScore.value = detail.score
  endScreenMeta.value = { totalTime: detail.totalTime, meta: detail.meta || null }
  showEndScreen.value = true
  isPaused.value = true
  showChrome()
  if (game && game.scene.isActive('PacmanScene')) {
    game.scene.pause('PacmanScene')
  }
}

function handlePacmanState(event: Event) {
  const detail = (event as CustomEvent<{ score: number; lives: number; level: number; pelletsRemaining: number }>).detail
  if (!detail) return

  score.value = detail.score
  lives.value = detail.lives
  level.value = detail.level
  pelletsRemaining.value = detail.pelletsRemaining
}

function handleEndScreenClose() {
  showEndScreen.value = false
  isPaused.value = false
  hideChrome()
}

async function handleEndScreenMounted() {
  if (!gameId.value || !userStore.user) return

  const previous = userStore.profile?.games?.Pacman?.[gameId.value]?.score ?? null
  if (previous !== null && endScreenScore.value <= previous) {
    return
  }

  try {
    await userStore.updateGameProgress('Pacman', gameId.value, {
      score: endScreenScore.value,
      streak: 0,
      custom: {
        levelReached: endScreenMeta.value.meta?.levelReached ?? level.value,
        pelletsRemaining: endScreenMeta.value.meta?.victory ? 0 : pelletsRemaining.value
      }
    })
  } catch (err) {
    console.error('Pacman: Failed to save score', err)
  }
}

function setDirection(dir: 'up' | 'down' | 'left' | 'right') {
  window.dispatchEvent(new CustomEvent('setDirection', { detail: dir }))
}

function togglePause() {
  isPaused.value = !isPaused.value
  window.dispatchEvent(new Event('togglePause'))
}

function restartGame() {
  isPaused.value = false
  window.dispatchEvent(new Event('restartGame'))
}

function onKeyDown(e: KeyboardEvent) {
  const map: Record<string, 'up' | 'down' | 'left' | 'right' | undefined> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    a: 'left',
    A: 'left',
    s: 'down',
    S: 'down',
    d: 'right',
    D: 'right'
  }
  const dir = map[e.key]
  if (dir) {
    e.preventDefault()
    setDirection(dir)
  }
}

function hideChrome() {
  document.querySelector('.navbar')?.classList.add('is-hidden')
  document.querySelector('footer.footer')?.classList.add('is-hidden')
  document.body.style.overflow = 'hidden'
}

function showChrome() {
  document.querySelector('.navbar')?.classList.remove('is-hidden')
  document.querySelector('footer.footer')?.classList.remove('is-hidden')
  document.body.style.overflow = ''
}
</script>

<style scoped>
.game-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1.5rem;
  padding: 1.5rem 1rem 3rem;
  background: radial-gradient(circle at top, #0b0d10, #050608 65%);
  color: #f5f7fa;
}

.hud {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  width: min(600px, 90vw);
}

.hud-card {
  background: rgba(12, 16, 24, 0.8);
  border: 1px solid rgba(61, 90, 254, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  text-align: center;
  box-shadow: 0 8px 24px rgba(13, 110, 253, 0.08);
}

.hud-card .label {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8aa4ff;
}

.hud-card .value {
  font-size: 1.5rem;
  font-weight: 700;
}

.game-canvas {
  width: min(90vw, 720px);
  height: min(90vw, 720px);
  max-width: 720px;
  max-height: 720px;
  border: 2px solid rgba(90, 108, 250, 0.35);
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 16px 40px rgba(9, 12, 23, 0.65);
}

.game-canvas canvas {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.controls.is-disabled {
  pointer-events: none;
  opacity: 0.5;
}

.dpad {
  display: grid;
  grid-template-columns: repeat(3, 50px);
  grid-template-rows: repeat(3, 50px);
  gap: 6px;
  justify-content: center;
}

.arrow {
  background: linear-gradient(145deg, #1f2937, #111827);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 8px;
  color: #e5edff;
  font-size: 1.25rem;
  font-weight: 700;
}

.arrow:active {
  transform: translateY(1px);
}

.dpad .mid {
  display: flex;
  align-items: center;
  gap: 6px;
  grid-column: 1 / span 3;
  justify-content: center;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .game-wrapper {
    flex-direction: column;
  }

  .controls {
    flex-direction: row;
    justify-content: center;
    gap: 2rem;
  }
}
</style>

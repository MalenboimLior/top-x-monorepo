<template>
  <div class="game-wrapper">
    <svg aria-hidden="true" width="0" height="0" style="position:absolute">
      <defs>
        <symbol id="ic-chevron-left" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </symbol>
        <symbol id="ic-arrow-up" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4l-7 7M12 4l7 7M12 4v16"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </symbol>
        <symbol id="ic-arrow-down" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20l7-7M12 20l-7-7M12 20V4"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </symbol>
        <symbol id="ic-arrow-left" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12l7-7M4 12l7 7M4 12h16"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </symbol>
        <symbol id="ic-arrow-right" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 12l-7-7M20 12l-7 7M20 12H4"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </symbol>
      </defs>
    </svg>

    <div class="game-header">
      <button class="x-btn x-back" @click="goBack" aria-label="Back">
        <svg class="icon"><use href="#ic-chevron-left" xlink:href="#ic-chevron-left" /></svg>
        <span class="label">Back</span>
      </button>
      <h2 class="subtitle has-text-success">{{ gameTitle }}</h2>
      <div class="header-spacer" aria-hidden="true"></div>
    </div>
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
      <div class="pad">
        <span class="spacer" />
        <button class="x-btn md" aria-label="Up" @click="setDirection('up')">
          <svg class="icon"><use href="#ic-arrow-up" xlink:href="#ic-arrow-up" /></svg>
        </button>
        <span class="spacer" />

        <button class="x-btn md" aria-label="Left" @click="setDirection('left')">
          <svg class="icon"><use href="#ic-arrow-left" xlink:href="#ic-arrow-left" /></svg>
        </button>
        <button class="x-btn md" aria-label="Down" @click="setDirection('down')">
          <svg class="icon"><use href="#ic-arrow-down" xlink:href="#ic-arrow-down" /></svg>
        </button>
        <button class="x-btn md" aria-label="Right" @click="setDirection('right')">
          <svg class="icon"><use href="#ic-arrow-right" xlink:href="#ic-arrow-right" /></svg>
        </button>
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
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import PacmanEndScreen from '@/components/games/pacman/PacmanEndScreen.vue'
import type { PacmanConfig } from '@top-x/shared/types/pacman'
import { db } from '@top-x/shared'
import { getGame } from '@/services/game'
import { useUserStore } from '@/stores/user'
import { analytics } from '@top-x/shared'
import { logEvent } from 'firebase/analytics'

const route = useRoute()
const router = useRouter()
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
    backgroundColor: '#000', // Keep black for game canvas
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
    const gameResult = await getGame(id)
    if (!gameResult.game) {
      console.warn('Pacman: Game document not found for ID:', id, gameResult.error)
      return
    }

    const data = gameResult.game
    
    // Check if game is active - if not, redirect home (game is not playable)
    if (!data.active) {
      console.error('Pacman: Game is not active, redirecting home')
      router.push('/')
      return
    }

    gameTitle.value = data.name || gameTitle.value
    gameDescription.value = data.description || gameDescription.value
    pacmanConfig.value = data.custom as PacmanConfig
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
  hideChrome()
  // Restart the game once the end screen is dismissed so play can resume automatically
  window.setTimeout(() => {
    restartGame()
  }, 50)
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

function restartGame() {
  if (game) {
    game.scene.resume('PacmanScene')
  }
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

function goBack() {
  showChrome()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'Home' })
  }
}
</script>

<style scoped>
.game-wrapper {
  --size: 60px;
  --radius: 16px;
  --icon: 24px;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1.5rem;
  padding: 1.5rem 1rem 3rem;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.game-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  max-width: min(600px, 90vw);
  gap: 8px;
}

.game-header h2 {
  grid-column: 2;
  justify-self: center;
  text-align: center;
  margin: 0;
}

.x-back {
  grid-column: 1;
  justify-self: start;
  padding: 8px 12px;
  gap: 8px;
  border-radius: 999px;
}

.x-back .label {
  font-weight: 600;
  font-size: 14px;
}

.header-spacer {
  grid-column: 3;
}

.hud {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  width: min(600px, 90vw);
}

.hud-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  text-align: center;
}

.hud-card .label {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.hud-card .value {
  font-size: 1.5rem;
  font-weight: 700;
}

.x-btn {
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--size);
  height: var(--size);
  padding: 0 14px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border-base);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transition: background-color var(--transition-fast), border-color var(--transition-fast), transform 0.08s ease;
}

.x-btn .icon {
  width: var(--icon);
  height: var(--icon);
  display: block;
  color: var(--color-primary);
}

.x-btn:hover {
  border-color: var(--color-border-primary);
  background-color: var(--color-bg-card-hover);
}

.x-btn:active {
  transform: translateY(1px) scale(0.985);
}

.x-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.x-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.x-btn.ghost {
  background: transparent;
  box-shadow: none;
}

.x-btn.round {
  border-radius: 999px;
}

.x-btn.sm {
  --size: 48px;
  --radius: 14px;
  --icon: 20px;
  min-width: var(--size);
}

.x-btn.md {
  --size: 60px;
  --radius: 16px;
  --icon: 24px;
  min-width: var(--size);
}

.x-btn.lg {
  --size: 72px;
  --radius: 18px;
  --icon: 28px;
  min-width: var(--size);
}

.game-canvas {
  width: min(90vw, 720px);
  height: min(90vw, 720px);
  max-width: 720px;
  max-height: 720px;
  border: 2px solid var(--color-border-primary);
  border-radius: 16px;
  overflow: hidden;
  background: #000; /* Keep black for game canvas */
  touch-action: none;
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

.pad {
  touch-action: none;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, var(--size));
  grid-auto-rows: var(--size);
}

.pad .spacer {
  visibility: hidden;
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

@media (prefers-reduced-motion: reduce) {
  .x-btn {
    transition: none;
  }
}
</style>

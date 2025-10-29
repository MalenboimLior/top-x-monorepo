<template>
  <div class="game-wrapper">
    <!-- SVG sprite for icons -->
    <svg aria-hidden="true" width="0" height="0" style="position:absolute">
      <defs>
        <symbol id="ic-chevron-left" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>
        <symbol id="ic-arrow-up" viewBox="0 0 24 24" fill="none">
          <path d="M12 4l-7 7M12 4l7 7M12 4v16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>
        <symbol id="ic-arrow-down" viewBox="0 0 24 24" fill="none">
          <path d="M12 20l7-7M12 20l-7-7M12 20V4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>
        <symbol id="ic-arrow-left" viewBox="0 0 24 24" fill="none">
          <path d="M4 12l7-7M4 12l7 7M4 12h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>
        <symbol id="ic-arrow-right" viewBox="0 0 24 24" fill="none">
          <path d="M20 12l-7-7M20 12l-7 7M20 12H4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>
      </defs>
    </svg>

    <div class="game-header">
      <!-- X‑style back button -->
      <button class="x-btn x-back" @click="goBack" aria-label="Back">
        <svg class="icon"><use href="#ic-chevron-left" xlink:href="#ic-chevron-left"/></svg>
        <span class="label"></span>
      </button>
      <h2 class="subtitle has-text-success" v-html="gameTitle"></h2>
      <div class="header-spacer" aria-hidden="true"></div>
    </div>

    <div ref="phaserContainer" class="phaser-container" />

    <!-- X‑style D‑Pad -->
    <div class="controls">
      <div class="pad">
        <span class="spacer" />
        <button class="x-btn md" aria-label="Up" @click="setDirection('up')">
          <svg class="icon"><use href="#ic-arrow-up" xlink:href="#ic-arrow-up"/></svg>
        </button>
        <span class="spacer" />

        <button class="x-btn md" aria-label="Left" @click="setDirection('left')">
          <svg class="icon"><use href="#ic-arrow-left" xlink:href="#ic-arrow-left"/></svg>
        </button>
        <button class="x-btn md" aria-label="Down" @click="setDirection('down')">
          <svg class="icon"><use href="#ic-arrow-down" xlink:href="#ic-arrow-down"/></svg>
        </button>
        <button class="x-btn md" aria-label="Right" @click="setDirection('right')">
          <svg class="icon"><use href="#ic-arrow-right" xlink:href="#ic-arrow-right"/></svg>
        </button>
      </div>

      <!-- Optional compact row (uncomment if you prefer) -->
      <!--
      <div class="row">
        <button class="x-btn sm round" aria-label="Left" @click="setDirection('left')">
          <svg class="icon"><use href="#ic-arrow-left"/></svg>
        </button>
        <button class="x-btn sm round" aria-label="Up" @click="setDirection('up')">
          <svg class="icon"><use href="#ic-arrow-up"/></svg>
        </button>
        <button class="x-btn sm round" aria-label="Right" @click="setDirection('right')">
          <svg class="icon"><use href="#ic-arrow-right"/></svg>
        </button>
      </div>
      -->

      <div class="actions">
        <!--
        <button class="x-btn sm ghost" @click="togglePause">Pause / Resume</button>
        <button class="x-btn sm ghost" @click="restartGame">Restart</button>
        -->
      </div>
    </div>

    <ZoneRevealEndScreen
      v-if="showEndScreen"
      :score="endScreenScore"
      :game-id="gameId"
      :reveal-at="revealAt"
      :answer-config="zoneRevealConfig?.answer ?? null"
      @close="showEndScreen = false"
    />
  </div>
</template>

<script setup lang="ts">
import ZoneRevealEndScreen from '@/components/games/zonereveal/ZoneRevealEndScreen.vue'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '@top-x/shared'
import Phaser from 'phaser'
import ZoneRevealScene, { WIDTH, HEIGHT } from '@/components/games/zonereveal/ZoneRevealScene'
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal'
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge'
import { useHead } from '@vueuse/head'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import { DateTime } from 'luxon'

const phaserContainer = ref<HTMLDivElement | null>(null)
let game: Phaser.Game | null = null
const route = useRoute()
const router = useRouter()
const zoneRevealConfig = ref<ZoneRevealConfig | null>(null)
const gameId = ref(route.query.game as string)
const challengeId = route.query.challenge as string | undefined
const gameTitle = ref('')
const gameDescription = ref('')
const showEndScreen = ref(false)
const endScreenScore = ref(0)
const revealAt = ref('')

type ZoneRevealDailyChallenge = DailyChallenge & { answerRevealUTC?: string }

const ensureZoneRevealAnswer = (config: ZoneRevealConfig): ZoneRevealConfig => {
  if (!config.answer) {
    config.answer = { solution: '', accepted: [], image: '' }
  } else if (!config.answer.accepted) {
    config.answer.accepted = []
  }
  return config
}

async function loadDailyChallengeDocument(
  gameId: string,
  challenge: string
): Promise<ZoneRevealDailyChallenge | null> {
  try {
    const challengeDocRef = doc(db, 'games', gameId, 'daily_challenges', challenge)
    const snapshot = await getDoc(challengeDocRef)

    if (!snapshot.exists()) {
      console.error('No challenge found for', challenge)
      return null
    }

    return snapshot.data() as ZoneRevealDailyChallenge
  } catch (err) {
    console.error('Failed fetching daily challenge:', err)
    return null
  }
}

async function findActiveDailyChallenge(
  gameId: string,
  fallbackId?: string
): Promise<ZoneRevealDailyChallenge | null> {
  const now = DateTime.utc()
  const nowISO = now.toISO()

  if (!nowISO) return null

  try {
    const challengesRef = collection(db, 'games', gameId, 'daily_challenges')
    const activeQuery = query(
      challengesRef,
      where('schedule.availableAt', '<=', nowISO),
      orderBy('schedule.availableAt', 'desc'),
      limit(5)
    )
    const snapshot = await getDocs(activeQuery)

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as ZoneRevealDailyChallenge
      if (data && isChallengeActive(data, now)) {
        return data
      }
    }
  } catch (err) {
    console.error('Failed fetching active daily challenge:', err)
  }

  if (fallbackId) {
    const fallbackChallenge = await loadDailyChallengeDocument(gameId, fallbackId)
    if (fallbackChallenge && isChallengeActive(fallbackChallenge, now)) {
      return fallbackChallenge
    }
  }

  return null
}

function isChallengeActive(challenge: ZoneRevealDailyChallenge, now: DateTime): boolean {
  const schedule = challenge?.schedule
  if (!schedule) return false

  const availableAt = DateTime.fromISO(schedule.availableAt, { zone: 'utc' })
  if (availableAt.isValid && availableAt > now) {
    return false
  }

  const closesAt = DateTime.fromISO(schedule.closesAt, { zone: 'utc' })
  if (closesAt.isValid && closesAt <= now) {
    return false
  }

  return true
}

function resolveRevealTimestamp(challenge: ZoneRevealDailyChallenge | null): string {
  if (!challenge) return ''

  const fromSchedule = challenge.schedule.revealAt
  if (fromSchedule) {
    return fromSchedule
  }

  return challenge.answerRevealUTC || ''
}

function hideChrome() {
  document.querySelector('.navbar')?.classList.add('is-hidden')
  document.querySelector('footer.footer')?.classList.add('is-hidden')
  document.body.style.overflow = 'hidden'
  // try to enter fullscreen so mobile browsers hide their UI chrome
  const docEl: any = document.documentElement
  const requestFull = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen
  try {
    requestFull?.call(docEl)
  } catch (err) {
    console.warn('Fullscreen request failed', err)
  }
  enableScroll()
}

function showChrome() {
  document.querySelector('.navbar')?.classList.remove('is-hidden')
  document.querySelector('footer.footer')?.classList.remove('is-hidden')
  document.body.style.overflow = ''
  // exit fullscreen if we previously entered it
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  }
  enableScroll()
}

function goBack() {
  showChrome()
  router.back()
}
function preventScroll(e: Event) {
  e.preventDefault()
}

function disableScroll() {
  document.addEventListener('touchmove', preventScroll, { passive: false })
}

function enableScroll() {
  document.removeEventListener('touchmove', preventScroll)
}
useHead({
  title: `TOP-X: ${gameTitle.value || 'Zone Reveal Game'}`,
  meta: [
    { name: 'description', content: gameDescription.value || "Play Zone Reveal on TOP-X: Navigate, avoid enemies, reveal the hidden image! Powered by Phaser and Firebase." },
  ],
})

onMounted(async () => {
  hideChrome()
  window.addEventListener('gameStart', hideChrome)
  if (!phaserContainer.value) return

  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value, view_type: 'play' })
  }

  if (gameId.value) {
    try {
      const gameDocRef = doc(db, 'games', gameId.value)
      const gameDoc = await getDoc(gameDocRef)

      if (!gameDoc.exists()) {
        console.error('ZoneReveal: Game document not found for ID:', gameId.value)
        return
      }

      const gameData = gameDoc.data()
      gameTitle.value = gameData.name || ''
      gameDescription.value = gameData.description || ''

      let loadedChallenge: ZoneRevealDailyChallenge | null = null

      if (challengeId) {
        loadedChallenge = await loadDailyChallengeDocument(gameId.value, challengeId)
      } else if (gameData.dailyChallengeActive) {
        loadedChallenge = await findActiveDailyChallenge(gameId.value, gameData.dailyChallengeCurrent)
      }

      if (loadedChallenge) {
        zoneRevealConfig.value = ensureZoneRevealAnswer(loadedChallenge.custom as ZoneRevealConfig)
        revealAt.value = resolveRevealTimestamp(loadedChallenge)
      } else {
        zoneRevealConfig.value = ensureZoneRevealAnswer(gameData.custom as ZoneRevealConfig)
        revealAt.value = ''
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
    physics: { default: 'arcade', arcade: {} },
    scene
  })

  window.addEventListener('gameOver', handleGameOver)

  // Optional keyboard support for the UI buttons
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  if (game) {
    game.destroy(true)
    game = null
  }
  window.removeEventListener('gameOver', handleGameOver)
  window.removeEventListener('gameStart', hideChrome)
  window.removeEventListener('keydown', onKeyDown)
  showChrome()
})

function handleGameOver(e: Event) {
  const customEvent = e as CustomEvent<{ score: number; totalTime: number }>
  endScreenScore.value = customEvent.detail.score
  showEndScreen.value = true
  showChrome()
  if (game && game.scene.isActive('GameScene')) {
    game.scene.pause('GameScene')
  }
}

function setDirection(dir: 'up' | 'down' | 'left' | 'right') {
  window.dispatchEvent(new CustomEvent('setDirection', { detail: dir }))
}

function onKeyDown(e: KeyboardEvent) {
  const m: Record<string, 'up' | 'down' | 'left' | 'right' | undefined> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right', W: 'up', A: 'left', S: 'down', D: 'right'
  }
  const dir = m[e.key]
  if (dir) setDirection(dir)
}

function togglePause() { window.dispatchEvent(new Event('togglePause')) }
function restartGame() { window.dispatchEvent(new Event('restartGame')) }
</script>

<style scoped>
/* X theme tokens local to this component */
.game-wrapper {
  --x-bg: #000000;
  --x-surface: #0b0d10;
  --x-elev: #0f1216;
  --x-border: #21262d;
  --x-border-strong: #2e3440;
  --x-text: #f5f7fa;
  --x-muted: #a5acb8;
  --x-accent: #1d9bf0;

  --size: 60px; /* D‑pad button size */
  --radius: 16px;
  --icon: 24px;
    touch-action: none;

}

.game-wrapper {
  max-width: 100vw;
  padding: 10px 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  overflow: hidden;
  background: var(--x-bg);
  color: var(--x-text);
}

.game-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr; /* symmetrical sides, title in the middle */
  align-items: center;
  width: 100%;
  gap: 8px;
  margin-bottom: 10px;
}
.game-header h2 {
  grid-column: 2;
  justify-self: center;
  text-align: center;
  margin: 0;
}
.x-back { grid-column: 1; justify-self: start; } 
.header-spacer { grid-column: 3; }

/* Back button styled like X */
.x-back {
  padding: 8px 12px;
  gap: 8px;
  border-radius: 999px;
}
.x-back .label { font-weight: 600; font-size: 14px; }

/* Button base */
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
  border: 1px solid var(--x-border);
  background: linear-gradient(180deg, var(--x-elev), var(--x-surface));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 10px 24px rgba(0,0,0,.55);
  color: var(--x-text);
  transition: transform .08s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, filter .18s ease;
}
.x-btn .icon { width: var(--icon); height: var(--icon); display: block; color:#00e8e0}
.x-btn:hover { border-color: var(--x-border-strong); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 14px 30px rgba(0,0,0,.6); }
.x-btn:active { transform: translateY(1px) scale(.985); filter: brightness(.98); }
.x-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px color-mix(in oklab, var(--x-accent) 55%, transparent),
    inset 0 1px 0 rgba(255,255,255,.08), 0 14px 30px rgba(0,0,0,.6);
}
.x-btn:disabled { opacity: .5; cursor: not-allowed; }

/* Variants / sizes */
.x-btn.ghost { background: transparent; box-shadow: none; }
.x-btn.round { border-radius: 999px; }
.x-btn.sm { --size: 48px; --radius: 14px; --icon: 20px; min-width: var(--size); }
.x-btn.md { --size: 60px; --radius: 16px; --icon: 24px; min-width: var(--size); }
.x-btn.lg { --size: 72px; --radius: 18px; --icon: 28px; min-width: var(--size); }

.phaser-container {
  width: 100%;
  max-width: 500px;
  border: 1px solid var(--x-border);
  border-radius: 16px;
  box-sizing: border-box;
  background: #111;
    touch-action: none;

}

.controls {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pad { touch-action: none; display: grid; gap: 10px; grid-template-columns: repeat(3, var(--size)); grid-auto-rows: var(--size); }
.pad .spacer { visibility: hidden; }
.row { display: flex; gap: 10px; margin: 8px 0; }
.actions { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }

/* Remove old generic button styling */
/* The new styles are class-based and scoped. */

@media (prefers-reduced-motion: reduce) {
  .x-btn { transition: none; }
}
</style>

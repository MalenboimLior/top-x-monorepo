
<template>
  <div class="game-wrapper">
    <h2 class="subtitle has-text-success" v-html="gameTitle"></h2>

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
  <!-- <button @click="togglePause">⏸️ Pause / ▶️ Resume</button>
  <button @click="restartGame">🔄 Restart</button> -->
</div>
    </div>
    <ZoneRevealEndScreen
      v-if="showEndScreen"
      :score="endScreenScore"
      :game-id="gameId"
      :answer-reveal-u-t-c="answerRevealUTC"
      @close="showEndScreen = false"
    />
  </div>
</template>

<script setup lang="ts">
import ZoneRevealEndScreen from '@/components/games/ZoneRevealEndScreen.vue'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@top-x/shared'
import Phaser from 'phaser'
import ZoneRevealScene, { WIDTH, HEIGHT } from '@/components/games/ZoneRevealScene'
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal'
import { useHead } from '@vueuse/head'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import { DateTime } from 'luxon'

const phaserContainer = ref<HTMLDivElement | null>(null)
let game: Phaser.Game | null = null
const route = useRoute()
const zoneRevealConfig = ref<ZoneRevealConfig | null>(null)
const gameId = ref((route.query.game as string))
const gameTitle = ref('')
const gameDescription = ref('')
const showEndScreen = ref(false)
const endScreenScore = ref(0)
const answerRevealUTC = ref('')

useHead({
  title: `TOP-X: ${gameTitle.value || 'Zone Reveal Game'}`,
  meta: [
    { name: 'description', content: gameDescription.value || "Play Zone Reveal on TOP-X: Navigate, avoid enemies, reveal the hidden image! Powered by Phaser and Firebase." },
  ],
})

onMounted(async () => {
  if (!phaserContainer.value) return

  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value, view_type: 'play' })
  }

  if (gameId.value) {
    try {
      const gameDocRef = doc(db, 'games', gameId.value)
      const gameDoc = await getDoc(gameDocRef)

      if (gameDoc.exists()) {
        const gameData = gameDoc.data()
        gameTitle.value = gameData.name || ''
        gameDescription.value = gameData.description || ''

        if (gameData.dailyChallengeActive) {
          try {
            const challengeDate = DateTime.utc().toFormat('yyyy-MM-dd')
            console.log('challengeDate:', challengeDate)

            let challengeDocRef = doc(db, 'games', gameId.value, 'daily_challenges', challengeDate)
            let snapshot = await getDoc(challengeDocRef)

            if (!snapshot.exists() && gameData.dailyChallengeCurrent) {
              challengeDocRef = doc(db, 'games', gameId.value, 'daily_challenges', gameData.dailyChallengeCurrent)
              snapshot = await getDoc(challengeDocRef)
            }

            if (snapshot.exists()) {
              const dailyChallenge = snapshot.data()
              const nowUTC = DateTime.utc()
              const unlockTime = DateTime.fromISO(dailyChallenge.challengeAvailableUTC)
              console.log('unlockTime:', unlockTime)
              console.log('nowUTC:', nowUTC)
              // if (nowUTC < unlockTime) {
              //   console.log('Challenge is not yet available.')
              // } else {
                zoneRevealConfig.value = dailyChallenge.custom as ZoneRevealConfig
                answerRevealUTC.value = dailyChallenge.answerRevealUTC || ''
                console.log("Today's challenge:", dailyChallenge)
            //  }
            } else {
              console.error('No challenge found for', challengeDate, 'or', gameData.dailyChallengeCurrent)
            }
          } catch (err) {
            console.error('Failed fetching daily challenge:', err)
          }
        } else {
          zoneRevealConfig.value = gameData.custom as ZoneRevealConfig

          console.log('ZoneReveal: Game data fetched:', {
            gameTitle: gameTitle.value,
            gameDescription: gameDescription.value,
            custom: zoneRevealConfig.value
          })
        }

        //game challance specific settings
        //TODO answerRevealUTC.value = gameData.answerRevealUTC || ''
      } else {
        console.error('ZoneReveal: Game document not found for ID:', gameId.value)
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
  window.addEventListener('gameOver', handleGameOver)
})

onBeforeUnmount(() => {
  if (game) {
    game.destroy(true)
    game = null
  }
  window.removeEventListener('gameOver', handleGameOver)
})
function handleGameOver(e: Event) {
  const customEvent = e as CustomEvent<{ score: number; totalTime: number }>
  endScreenScore.value = customEvent.detail.score
  showEndScreen.value = true
  if (game && game.scene.isActive('GameScene')) {
    game.scene.pause('GameScene') // Ensure paused
  }
}

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

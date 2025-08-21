<template>
  <div class="modal is-active" @click.self="handleTryAgain">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="retry" @click="handleTryAgain"></button>
      <template v-if="!userStore.user">
        <h2 class="title has-text-white">{{ score }}</h2>
        <h2 class="title has-text-white">Great Score!</h2>
        <p class="mb-4">
          Log in with X to:<br />
          save your score to leaderboard:<br />
          Guess and submit your answer!<br />
          We grab just your username + pic - promise, no funny business. 🔒:<br />
        </p>
        <div class="buttons">
          <button class="button is-success" @click="handleLogin">Log in with X</button>
          <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        </div>
      </template>
      <template v-else>
        <h2 class="title has-text-white">{{ score }}</h2>
        <p>Take your Guess-</p>
        <div v-if="!hasSubmitted">
          <input v-model="answer" placeholder="Your guess..." @keydown.stop />
          <button class="button is-success" @click="handleSubmit">Submit Answer</button>
        </div>
        <div v-else>
          <p>Wonder if you got it right? 🤔</p>
          <p>The answer will be announced at {{ formattedRevealDate }}</p>
          <p>
            Follow
            <a href="https://x.com/Topxisrael" target="_blank">@Topxisrael</a>
            to see the answer and the winners!
          </p>
          <p>Good luck! 🤞🏻</p>
        </div>
        <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        <div class="leaderboard-section">
          <h3>Top Players</h3>
          <table v-if="leaderboard.length" class="table is-fullwidth is-striped">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in leaderboard" :key="entry.uid">
                <td>{{ index + 1 }}</td>
                <td>
                  <figure class="image is-32x32 is-inline-block">
                    <img :src="entry.photoURL" alt="Profile" class="is-rounded" />
                  </figure>
                  @{{ entry.username }}
                </td>
                <td>{{ entry.score }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else>No leaderboard data available yet.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import axios from 'axios'
import type { LeaderboardEntry } from '@top-x/shared/types'

const props = defineProps<{
  score: number
  gameId: string
  answerRevealUTC: string
}>()

const emit = defineEmits(['close'])

const userStore = useUserStore()
const answer = ref('')
const hasSubmitted = ref(false)
const leaderboard = ref<LeaderboardEntry[]>([])

const formattedRevealDate = computed(() => new Date(props.answerRevealUTC).toLocaleString())

onMounted(async () => {
  if (userStore.user) {
    await saveScore()
    await fetchLeaderboard()
  }
})

async function fetchLeaderboard() {
  try {
    const response = await axios.get(`https://us-central1-top-x-co.cloudfunctions.net/getTopLeaderboard?gameId=${props.gameId}&limit=10`)
    leaderboard.value = response.data
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
  }
}

async function saveScore(custom = {}) {
  if (!props.gameId) {
    console.error('No gameId provided')
    return
  }

  if (!userStore.user) return // Safety

  const gameTypeId = 'ZoneReveal'

  // Only save if this score is better than the previously stored one
  const previousScore =
    userStore.profile?.games?.[gameTypeId]?.[props.gameId]?.score ?? null

  if (previousScore !== null && props.score <= previousScore) {
    console.log('New score is not higher than existing score. Skipping save.')
    return
  }

  try {
    await userStore.updateGameProgress(gameTypeId, props.gameId, {
      score: props.score,
      streak: 0,
      lastPlayed: new Date().toISOString(),
      custom
    })
  } catch (err) {
    console.error('Save score error:', err)
  }
}

async function handleSubmit() {
  const custom = { answer: answer.value }
  await saveScore(custom)
  hasSubmitted.value = true
  await fetchLeaderboard()
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'submit_answer', game_id: props.gameId, answer: answer.value })
  }
}

function handleTryAgain() {
  // Blur any focused input
  const active = document.activeElement as HTMLElement | null
  if (active && typeof active.blur === 'function') {
    active.blur()
  }

  emit('close')

  // Slight delay to allow modal to unmount smoothly before restarting
  setTimeout(() => {
    window.dispatchEvent(new Event('restartGame'))
  }, 100)
}

async function handleLogin() {
  localStorage.setItem(
    `zonereveal_${props.gameId}`,
    JSON.stringify({ answer: answer.value, score: props.score })
  )
  try {
    const success = await userStore.loginWithX()
    if (success && userStore.user) {
      const pending = JSON.parse(
        localStorage.getItem(`zonereveal_${props.gameId}`) || '{}'
      )
      if (pending.answer) {
        answer.value = pending.answer
        await saveScore({ answer: pending.answer })
        hasSubmitted.value = true
      } else {
        await saveScore()
      }
      localStorage.removeItem(`zonereveal_${props.gameId}`)
      await fetchLeaderboard()
      if (analytics) {
        logEvent(analytics, 'user_action', {
          action: 'login',
          method: 'x_auth',
          context: 'zone_reveal_end_screen',
          game_id: props.gameId
        })
      }
    }
  } catch (err) {
    console.error('Login error:', err)
    alert('Failed to login. Please try again.')
  }
}
</script>

<style scoped>
.modal-content {
  max-width: 400px;
  padding: 2rem !important;
  text-align: center;
  position: relative;
}

.delete {
  position: absolute;
  top: 10px;
  right: 10px;
}

input {
  padding: 8px;
  margin: 10px 0;
  width: 80%;
}

.button.is-success {
  background-color: var(--bulma-success, #c4ff00);
  color: #000;
}

.button.is-text {
  text-decoration: underline;
}

.leaderboard-section {
  margin-top: 20px;
  text-align: left;
}

.image.is-32x32 {
  vertical-align: middle;
  margin-right: 8px;
}

.table {
  background-color: #333;
  color: white;
}

.table th {
  color: #ddd;
}
</style>
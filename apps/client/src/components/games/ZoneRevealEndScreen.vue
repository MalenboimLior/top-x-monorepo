<template>
  <div class="end-screen-modal">
    <h2>Game Over</h2>
    <p>Take your Guess-</p>
    <div v-if="!userStore.user">
      <p>Login to submit your answer and save your score</p>
      <button @click="handleLogin">Login</button>
    </div>
    <div v-else-if="!hasSubmitted">
      <input v-model="answer" placeholder="Your guess..." @keydown.stop />
      <button @click="handleSubmit">Submit Answer</button>
    </div>
    <div v-if="hasSubmitted">
      <p>Wonder if you got it right? 🤔</p>
<p>The answer will be announced at  {{ formattedRevealDate }}</p>
      <p>Follow <a href="https://x.com/Topxisrael" target="_blank">@Topxisrael</a> to see the answer and the winners!</p>
          <p>Good luck! 🤞🏻 </p>

    </div>
<button @click="handleTryAgain">🔁 Try Again</button>

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
              @{{ entry.username }} <!-- {{ entry.displayName }} ( -->
            </td>
            <td>{{ entry.score }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else>No leaderboard data available yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import { useRouter } from 'vue-router'
import axios from 'axios'
import type { LeaderboardEntry } from '@top-x/shared/types'

const props = defineProps<{
  score: number
  gameId: string
  answerRevealUTC: string
}>()

const emit = defineEmits(['close'])

const userStore = useUserStore()
const router = useRouter()
const answer = ref('')
const hasSubmitted = ref(false)
const leaderboard = ref<LeaderboardEntry[]>([])

const formattedRevealDate = computed(() => new Date(props.answerRevealUTC).toLocaleString())

onMounted(() => {
  fetchLeaderboard()
})

async function fetchLeaderboard() {
  try {
    const response = await axios.get(`https://us-central1-top-x-co.cloudfunctions.net/getTopLeaderboard?gameId=${props.gameId}&limit=10`)
    leaderboard.value = response.data
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
  }
}

async function handleSubmit() {
  if (!props.gameId) {
    console.error('No gameId provided')
    alert('Error: No game ID')
    return
  }

  if (!userStore.user) return // Safety

  const gameTypeId = 'ZoneReveal'
  const custom = { answer: answer.value }

  try {
    await userStore.updateGameProgress(gameTypeId, props.gameId, {
      score: props.score,
      streak: 0,
      lastPlayed: new Date().toISOString(),
      custom
    })
    hasSubmitted.value = true
    if (analytics) {
      logEvent(analytics, 'user_action', { action: 'submit_answer', game_id: props.gameId, answer: answer.value })
    }
  } catch (err) {
    console.error('Submit error:', err)
    alert('Failed to submit. Try again.')
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
function handleLogin() {
  // Store pending data
  localStorage.setItem(`zonereveal_${props.gameId}`, JSON.stringify({
    answer: answer.value,
    score: props.score
  }))
  localStorage.setItem(`showLoginPopup_${props.gameId}`, 'true')
  // Trigger login (adapt to your auth flow)
  router.push('/login') // Or userStore.showLoginPopup = true
}
</script>

<style scoped>
.end-screen-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #222;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  color: white;
  z-index: 100;
  width: 100%;
  max-width: 400px; /* Matches game canvas width for full coverage */
  overflow-y: auto;
  max-height: 80vh;
}
input {
  padding: 8px;
  margin: 10px 0;
  width: 80%;
}
button {
  padding: 10px 20px;
  background: #555;
  color: white;
  border: none;
  border-radius: 8px;
  margin: 5px;
}
button:hover {
  background: #888;
}
a {
  color: #00ff00;
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
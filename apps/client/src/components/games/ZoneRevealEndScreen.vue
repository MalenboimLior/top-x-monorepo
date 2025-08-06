<template>
  <div class="end-screen-modal">
    <h2>Game Over</h2>
    <p>Can you guess?</p>
    <div v-if="!userStore.user">
      <p>Login to submit your answer and save your score</p>
      <button @click="handleLogin">Login</button>
    </div>
    <div v-else-if="!hasSubmitted">
      <input v-model="answer" placeholder="Your guess..." />
      <button @click="handleSubmit">Submit Answer</button>
    </div>
    <div v-if="hasSubmitted">
      <p>Good luck! We will reveal the answer on {{ formattedRevealDate }}</p>
      <p>Follow <a href="https://x.com/Topxapp" target="_blank">@Topxapp</a> to see the answer and the winners!</p>
    </div>
    <button @click="$emit('close')">Close</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { doc, updateDoc } from 'firebase/firestore' // If direct update; else use userStore method
import { db } from '@top-x/shared'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import { useRouter } from 'vue-router'

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

const formattedRevealDate = computed(() => new Date(props.answerRevealUTC).toLocaleString())

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
</style>
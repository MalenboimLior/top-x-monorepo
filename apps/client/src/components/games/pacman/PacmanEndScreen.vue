<template>
  <div class="modal is-active" @click.self="handleTryAgain">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="retry" @click="handleTryAgain"></button>
      <div class="score-preview">
        <div class="score-block">
          <h2 class="title has-text-white">{{ score }}</h2>
          <p class="subtitle is-6 has-text-grey-light">Final score</p>
        </div>
        <div class="meta-block">
          <p class="has-text-grey-light">Levels cleared: {{ levelReached }}</p>
          <p class="has-text-grey-light">Time survived: {{ formattedTime }}</p>
        </div>
      </div>
      <template v-if="!userStore.user">
        <h2 class="title has-text-white">Great score!</h2>
        <p class="mb-4">
          Log in with X to save your score to the leaderboard and chase the top spot. 🔒
        </p>
        <div class="buttons">
          <button class="button is-success" @click="handleLogin">Log in with X</button>
          <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        </div>
      </template>
      <template v-else>
        <p class="mb-4">Score saved! See how you rank below.</p>
        <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        <Leaderboard :game-id="gameId" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import Leaderboard from '@/components/Leaderboard.vue'
import { analytics } from '@top-x/shared'
import { logEvent } from 'firebase/analytics'

const props = defineProps<{
  score: number
  gameId: string
  totalTime: number
  meta: { victory?: boolean; levelReached?: number } | null
}>()

const emit = defineEmits(['close', 'mounted'])

const userStore = useUserStore()

const formattedTime = computed(() => {
  const minutes = Math.floor(props.totalTime / 60)
  const seconds = Math.round(props.totalTime % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const levelReached = computed(() => props.meta?.levelReached ?? 1)

onMounted(() => {
  emit('mounted')
  if (analytics) {
    logEvent(analytics, 'game_view', {
      game_name: props.gameId,
      view_type: 'end_screen',
      score: props.score,
      level_reached: levelReached.value
    })
  }
})

function handleTryAgain() {
  emit('close')
}

async function handleLogin() {
  try {
    const success = await userStore.loginWithX()
    if (success && userStore.user && analytics) {
      logEvent(analytics, 'login', { method: 'x_pacman_end_screen' })
    }
  } catch (err) {
    console.error('PacmanEndScreen login error:', err)
  }
}
</script>

<style scoped>
.modal-content {
  position: relative;
  max-width: 480px;
}

.score-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.score-block {
  text-align: center;
}

.meta-block {
  text-align: end;
  font-size: 0.9rem;
}

.buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>

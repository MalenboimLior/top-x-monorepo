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
        <img
          v-if="revealImage"
          :src="revealImage"
          alt="Zone reveal preview"
          class="reveal-preview"
        />
      </div>
      <template v-if="!userStore.user">
        <h2 class="title has-text-white">Great Score!</h2>
        <p class="mb-4">
          Log in with X to:<br />
          save your score to leaderboard;<br />
          guess and submit your answer!<br />
          We grab just your username + pic - promise, no funny business. 🔒
        </p>
        <p v-if="revealImage" class="mb-4 has-text-grey-light">
          Can't wait? Take a peek at the reveal image and come back with your best guess!
        </p>
        <div class="buttons">
          <button class="button is-success" @click="handleLogin">Log in with X</button>
          <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        </div>
      </template>
      <template v-else>
        <p class="mb-3">Take your best guess at what you've revealed!</p>
        <div v-if="!hasSubmitted">
          <input v-model="answer" placeholder="Your guess..." @keydown.stop />
          <button class="button is-success" @click="handleSubmit">Submit Answer</button>
        </div>
        <div v-else>
          <p v-if="submissionMessage" :class="submissionMessageClass">{{ submissionMessage }}</p>
          <p v-else>Wonder if you got it right? 🤔</p>
          <p>The answer will be announced at {{ formattedRevealDate }}</p>
          <p>
            Follow
            <a href="https://x.com/Topxisrael" target="_blank">@Topxisrael</a>
            to see the answer and the winners!
          </p>
          <p>Good luck! 🤞🏻</p>
          <p v-if="submissionResult" class="submitted-answer">Your guess: "{{ submissionResult.originalAnswer }}"</p>
        </div>
        <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        <div v-if="hasDailyChallenge" class="challenge-meta">
          <h3 class="challenge-meta__title">Daily challenge context</h3>
          <p class="challenge-meta__item"><strong>ID:</strong> {{ dailyChallengeId }}</p>
          <p v-if="challengeAvailableAt" class="challenge-meta__item">
            <strong>Available:</strong> {{ challengeAvailableAt }}
          </p>
          <p v-if="challengeClosesAt" class="challenge-meta__item">
            <strong>Closes:</strong> {{ challengeClosesAt }}
          </p>
        </div>
        <div class="leaderboards">
          <Leaderboard
            v-if="hasDailyChallenge"
            :game-id="gameId"
            :daily-challenge-id="dailyChallengeId || undefined"
            title="Today's Standings"
          />
          <Leaderboard
            :game-id="gameId"
            title="All-Time Leaders"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import Leaderboard from '@/components/Leaderboard.vue'
import { recordGameEvents } from '@/services/gameCounters'
import { GAME_COUNTER_EVENTS } from '@top-x/shared/types/counters'
import { DateTime } from 'luxon'
import type { ZoneRevealAnswer } from '@top-x/shared/types/zoneReveal'
import {
  evaluateZoneRevealAnswer,
  normalizeZoneRevealAnswer,
  type ZoneRevealAnswerEvaluation
} from '@top-x/shared/utils/zoneRevealAnswer'

const props = defineProps<{
  score: number
  gameId: string
  revealAt: string
  answerConfig: ZoneRevealAnswer | null
  challengeContext?: {
    id: string
    availableAt?: string
    closesAt?: string
    revealAt?: string
    dailyDate?: string
  } | null
}>()

const emit = defineEmits(['close'])

const userStore = useUserStore()
const answer = ref('')
const hasSubmitted = ref(false)
const submissionResult = ref<ZoneRevealAnswerEvaluation | null>(null)
const lastAutoSaveKey = ref<string | null>(null)
const pendingSave = ref<Record<string, unknown> | null>(null)

const revealImage = computed(() => props.answerConfig?.image ?? '')
const dailyChallengeId = computed(() => props.challengeContext?.id ?? null)
const dailyChallengeDate = computed(() => props.challengeContext?.dailyDate ?? null)

const challengeAvailableAt = computed(() => formatChallengeDate(props.challengeContext?.availableAt))
const challengeClosesAt = computed(() => formatChallengeDate(props.challengeContext?.closesAt))
const hasDailyChallenge = computed(() => Boolean(dailyChallengeId.value))
const isChallengeContextResolved = computed(() => props.challengeContext !== undefined)

const formattedRevealDate = computed(() => {
  if (!props.revealAt) return ''

  const reveal = DateTime.fromISO(props.revealAt, { zone: 'utc' })
  if (reveal.isValid) {
    return reveal.toLocal().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
  }

  return new Date(props.revealAt).toLocaleString()
})

const submissionMessage = computed(() => {
  if (!submissionResult.value) return ''
  return submissionResult.value.isMatch
    ? 'Your answer was accepted! 🎉'
    : "Thanks! We didn't auto-accept that answer, but we'll review it alongside the reveal."
})

const submissionMessageClass = computed(() =>
  submissionResult.value?.isMatch ? 'has-text-success' : 'has-text-warning'
)

onMounted(() => {
  void attemptAutoSave()
})

watch(
  [
    () => userStore.user,
    () => dailyChallengeId.value,
    () => props.score,
    () => props.challengeContext
  ],
  () => {
    void attemptAutoSave()
  }
)

async function attemptAutoSave() {
  if (!userStore.user) return
  if (!isChallengeContextResolved.value) return

  const challengeId = dailyChallengeId.value

  if (props.challengeContext && !challengeId) {
    if (pendingSave.value === null) {
      pendingSave.value = {}
    }
    return
  }

  const customPayload = pendingSave.value ?? {}
  const saveKey = `${challengeId ?? 'global'}::${props.score}`
  if (pendingSave.value === null && lastAutoSaveKey.value === saveKey) {
    return
  }

  pendingSave.value = null
  await saveScore(customPayload)
  lastAutoSaveKey.value = saveKey
}

async function saveScore(custom: Record<string, unknown> = {}) {
  if (!props.gameId) {
    console.error('No gameId provided')
    return
  }

  if (!userStore.user) return // Safety

  const gameTypeId = 'ZoneReveal'

  const isDailyChallenge = hasDailyChallenge.value
  const challengeId = dailyChallengeId.value

  // Only save if this score is better than the previously stored one
  const previousScore =
    userStore.profile?.games?.[gameTypeId]?.[props.gameId]?.score ?? null

  if (props.challengeContext && !challengeId) {
    pendingSave.value = custom
    console.warn('Daily challenge context present without id; skipping score save until id is available')
    return
  }

  pendingSave.value = null

  if (!isDailyChallenge && previousScore !== null && props.score <= previousScore) {
    console.log('New score is not higher than existing score. Skipping save.')
    return
  }

  try {
    await userStore.updateGameProgress(
      gameTypeId,
      props.gameId,
      {
        score: props.score,
        streak: 0,
        custom
      },
      {
        dailyChallengeId: dailyChallengeId.value ?? undefined,
        dailyChallengeDate: dailyChallengeDate.value ?? undefined,
        challengeMetadata: props.challengeContext
          ? {
              availableAt: props.challengeContext.availableAt,
              closesAt: props.challengeContext.closesAt,
              revealAt: props.challengeContext.revealAt ?? props.revealAt
            }
          : undefined
      }
    )
  } catch (err) {
    console.error('Save score error:', err)
  }
}

async function handleSubmit() {
  if (!answer.value.trim()) {
    return
  }

  const evaluation = evaluateSubmission(answer.value)
  await saveScore(evaluation)
  hasSubmitted.value = true
  submissionResult.value = evaluation
  if (userStore.user) {
    void recordGameEvents(props.gameId, [GAME_COUNTER_EVENTS.SUBMIT_ANSWER], {
      dailyChallengeId: dailyChallengeId.value ?? undefined,
      dailyChallengeDate: dailyChallengeDate.value ?? undefined
    })
  }
  if (analytics) {
    logEvent(analytics, 'user_action', {
      action: 'submit_answer',
      game_id: props.gameId,
      answer: evaluation.originalAnswer,
      normalized_answer: evaluation.normalizedAnswer,
      distance: evaluation.distance,
      is_match: evaluation.isMatch,
      daily_challenge_id: dailyChallengeId.value ?? undefined,
      daily_challenge_date: dailyChallengeDate.value ?? undefined
    })
  }
}

function handleTryAgain() {
  // Blur any focused input
  const active = document.activeElement as HTMLElement | null
  if (active && typeof active.blur === 'function') {
    active.blur()
  }

  answer.value = ''
  hasSubmitted.value = false
  submissionResult.value = null

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
        const evaluation = evaluateSubmission(pending.answer)
        await saveScore(evaluation)
        hasSubmitted.value = true
        submissionResult.value = evaluation
      } else {
        await saveScore()
      }
      localStorage.removeItem(`zonereveal_${props.gameId}`)
      if (analytics) {
        logEvent(analytics, 'user_action', {
          action: 'login',
          method: 'x_auth',
          context: 'zone_reveal_end_screen',
          game_id: props.gameId,
          daily_challenge_id: dailyChallengeId.value ?? undefined,
          daily_challenge_date: dailyChallengeDate.value ?? undefined
        })
      }
    }
  } catch (err) {
    console.error('Login error:', err)
    alert('Failed to login. Please try again.')
  }
}

function formatChallengeDate(value?: string | null): string {
  if (!value) return ''
  const parsed = DateTime.fromISO(value, { zone: 'utc' })
  if (parsed.isValid) {
    return parsed.toLocal().toLocaleString(DateTime.DATETIME_MED)
  }
  return new Date(value).toLocaleString()
}

function evaluateSubmission(attempt: string): ZoneRevealAnswerEvaluation {
  if (!attempt) {
    return {
      originalAnswer: '',
      normalizedAnswer: '',
      distance: null,
      isMatch: false
    }
  }

  if (props.answerConfig) {
    return evaluateZoneRevealAnswer(props.answerConfig, attempt)
  }

  return {
    originalAnswer: attempt,
    normalizedAnswer: normalizeZoneRevealAnswer(attempt),
    distance: null,
    isMatch: false
  }
}
</script>

<style scoped>
.modal-content {
  max-width: 520px;
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
  width: 100%;
}

.button.is-success {
  background-color: var(--bulma-success, #c4ff00);
  color: #000;
}

.score-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.score-block {
  min-width: 140px;
}

.reveal-preview {
  max-width: 180px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
}

.submitted-answer {
  margin-top: 1rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
}

.challenge-meta {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  text-align: left;
}

.challenge-meta__title {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.85);
}

.challenge-meta__item {
  margin: 0.25rem 0;
  color: rgba(255, 255, 255, 0.75);
}

.leaderboards {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

@media (min-width: 768px) {
  .leaderboards {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}
</style>

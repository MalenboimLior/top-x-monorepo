<template>
  <div class="modal is-active" @click.self="handleTryAgain">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="retry" @click="handleTryAgain"></button>
      <div v-if="isNewBestScore" class="notification is-success new-best-indicator">
        <strong>New best score!</strong> 🏆 Way to level up!
      </div>
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
        <p class="mb-3">{{ statusIntroMessage }}</p>
        <div class="answer-panel">
          <input
            v-model="answer"
            placeholder="Your guess..."
            :disabled="isAnswerFieldDisabled"
            :readonly="isAnswerReadOnly"
            @keydown.stop
          />
          <button
            class="button is-success"
            :disabled="!canSubmitAnswer || !answer.trim()"
            @click="handleSubmit"
          >
            {{ submitButtonLabel }}
          </button>
          <p v-if="challengeInputRestrictionMessage" class="help is-warning">
            {{ challengeInputRestrictionMessage }}
          </p>
        </div>
        <div class="submission-status">
          <div v-if="isChallengeOpen && closesCountdown" class="submission-status__countdown">
            <span class="submission-status__countdown-label">Challenge closes in</span>
            <span class="submission-status__countdown-timer">{{ closesCountdown }}</span>
          </div>
          <template v-if="isChallengeRevealed">
            <p v-if="revealedAnswer" class="reveal-answer">
              Correct answer:
              <span class="reveal-answer__text">"{{ revealedAnswer }}"</span>
            </p>
            <p v-if="submissionMessage" :class="['reveal-outcome', submissionMessageClass]">
              {{ submissionMessage }}
            </p>
            <p v-if="revealedDistanceMessage" class="reveal-distance">{{ revealedDistanceMessage }}</p>
            <p v-if="!submissionResult">Answer is available! Submit to see how you compare.</p>
            <p v-if="formattedRevealDate" class="reveal-date">Revealed on {{ formattedRevealDate }}</p>
          </template>
          <template v-else>
            <p v-if="submissionMessage" :class="submissionMessageClass">{{ submissionMessage }}</p>
            <p v-else-if="isChallengeClosed && !hasAnswered">
              Challenge is closed—you can still answer to see how you stacked up when we reveal.
            </p>
            <p v-else-if="isChallengeClosed && hasAnswered">
              Your answer was
              <span class="submitted-answer__text">"{{ submissionResult?.originalAnswer || answer }}"</span>
              — we'll reveal soon!
            </p>
            <p v-else-if="hasSubmitted">Wonder if you got it right? 🤔</p>
            <p v-else>Share your best guess to see if you nailed it!</p>
            <p v-if="formattedRevealDate">The answer will be announced at {{ formattedRevealDate }}</p>
          </template>
          <p v-if="isChallengeRevealed && submissionResult" class="reveal-followup">
            The answer has been announced—see how you did!
          </p>
          <div v-if="challengeReward" class="reveal-claim">
            <button class="button is-primary is-small" @click="handleRevealClaim">
              Show answer
            </button>
          </div>
          <p>
            Follow
            <a href="https://x.com/Topxisrael" target="_blank">@Topxisrael</a>
            to see the answer and the winners!
          </p>
          <p>Good luck! 🤞🏻</p>
          <p v-if="hasAnswered" class="submitted-answer">
            Your guess:
            <span class="submitted-answer__text">"{{ submissionResult?.originalAnswer || answer }}"</span>
          </p>
        </div>
        <div class="action-buttons">
          <button
            class="button is-warning is-light"
            :disabled="!canSubmitAnswer"
            @click="handleSkipSubmission"
          >
            I don't know – play again
          </button>
          <button class="button is-text has-text-white" @click="handleTryAgain">
            🔁 Try Again
          </button>
        </div>
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
        <div v-if="shouldShowLeaderboards" class="leaderboards">
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { logEvent } from 'firebase/analytics'
import { analytics } from '@top-x/shared'
import Leaderboard from '@/components/Leaderboard.vue'
import { DateTime } from 'luxon'
import type { ZoneRevealAnswer } from '@top-x/shared/types/zoneReveal'
import type { DailyChallengeRewardRecord } from '@top-x/shared/types/user'
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
    allowAnswerUpdates?: boolean
  } | null
}>()

const emit = defineEmits(['close'])

const userStore = useUserStore()
const answer = ref('')
const hasSubmitted = ref(false)
const submissionResult = ref<ZoneRevealAnswerEvaluation | null>(null)
const lastAutoSaveKey = ref<string | null>(null)
const pendingSave = ref<Record<string, unknown> | null>(null)
const isNewBestScore = ref(false)
const globalBestScore = ref<number | null>(null)
const challengeBestScore = ref<number | null>(null)
const lastHydratedAnswer = ref('')
const hasUserEditedAnswer = ref(false)
const showLeaderboards = ref(false)
const now = ref<DateTime>(DateTime.now())
let nowInterval: number | null = null

const revealImage = computed(() => props.answerConfig?.image ?? '')
const dailyChallengeId = computed(() => props.challengeContext?.id ?? null)
const dailyChallengeDate = computed(() => props.challengeContext?.dailyDate ?? null)

const challengeAvailableAt = computed(() => formatChallengeDate(props.challengeContext?.availableAt))
const challengeClosesAt = computed(() => formatChallengeDate(props.challengeContext?.closesAt))
const hasDailyChallenge = computed(() => Boolean(dailyChallengeId.value))

type ChallengeReward = DailyChallengeRewardRecord & { id: string }

const challengeReward = computed<ChallengeReward | null>(() => {
  if (!dailyChallengeId.value) {
    return null
  }

  const rewards = userStore.readyDailyChallengeRewards as ChallengeReward[] | undefined
  if (!Array.isArray(rewards)) {
    return null
  }

  return rewards.find((reward) => reward.dailyChallengeId === dailyChallengeId.value && reward.gameId === props.gameId) || null
})
const isChallengeContextResolved = computed(() => props.challengeContext !== undefined)
const rawChallengeAvailableAt = computed(() => props.challengeContext?.availableAt ?? null)
const rawChallengeClosesAt = computed(() => props.challengeContext?.closesAt ?? null)
const rawChallengeRevealAt = computed(
  () => props.challengeContext?.revealAt ?? props.revealAt ?? null
)

const challengeAvailableDate = computed(() => parseChallengeDate(rawChallengeAvailableAt.value))
const challengeClosesDate = computed(() => parseChallengeDate(rawChallengeClosesAt.value))
const challengeRevealDate = computed(() => parseChallengeDate(rawChallengeRevealAt.value))

const ChallengeStatus = {
  Upcoming: 'upcoming',
  Open: 'open',
  Closed: 'closed',
  Revealed: 'revealed'
} as const

type ChallengeStatus = (typeof ChallengeStatus)[keyof typeof ChallengeStatus]

const challengeStatus = computed<ChallengeStatus>(() => {
  if (!props.challengeContext) {
    return ChallengeStatus.Revealed
  }

  const current = now.value
  const revealAt = challengeRevealDate.value
  if (revealAt && current >= revealAt) {
    return ChallengeStatus.Revealed
  }

  const closesAt = challengeClosesDate.value
  if (closesAt && current >= closesAt) {
    return ChallengeStatus.Closed
  }

  const availableAt = challengeAvailableDate.value
  if (availableAt && current < availableAt) {
    return ChallengeStatus.Upcoming
  }

  return ChallengeStatus.Open
})

const isChallengeOpen = computed(() => challengeStatus.value === ChallengeStatus.Open)
const isChallengeClosed = computed(() => challengeStatus.value === ChallengeStatus.Closed)
const isChallengeRevealed = computed(() => challengeStatus.value === ChallengeStatus.Revealed)
const hasAnswered = computed(() => hasSubmitted.value || Boolean(submissionResult.value))
const shouldShowLeaderboards = computed(
  () => showLeaderboards.value || hasAnswered.value
)

const allowAnswerUpdates = computed(() => {
  if (props.challengeContext?.allowAnswerUpdates !== undefined) {
    return Boolean(props.challengeContext.allowAnswerUpdates)
  }
  return isChallengeOpen.value
})

const isAnswerLocked = computed(() => hasAnswered.value && !allowAnswerUpdates.value)
const isAnswerFieldDisabled = computed(() => challengeStatus.value === ChallengeStatus.Upcoming)
const isAnswerReadOnly = computed(() => isAnswerLocked.value)

const closesCountdown = computed(() => {
  if (!isChallengeOpen.value) return ''
  const closesAt = challengeClosesDate.value
  if (!closesAt) return ''

  let diffSeconds = Math.floor(closesAt.diff(now.value, 'seconds').seconds ?? 0)
  if (diffSeconds <= 0) {
    return '00:00:00'
  }

  const days = Math.floor(diffSeconds / 86_400)
  diffSeconds %= 86_400
  const hours = Math.floor(diffSeconds / 3_600)
  diffSeconds %= 3_600
  const minutes = Math.floor(diffSeconds / 60)
  const seconds = diffSeconds % 60

  const baseTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return days > 0 ? `${days}d ${baseTime}` : baseTime
})

const storedGameData = computed(() => userStore.profile?.games?.ZoneReveal?.[props.gameId] ?? null)

const storedChallengeGameData = computed(() => {
  if (!dailyChallengeId.value) return null
  return storedGameData.value?.dailyChallenges?.[dailyChallengeId.value] ?? null
})

const storedChallengeProgress = computed(
  () => storedChallengeGameData.value?.custom?.dailyChallengeProgress ?? null
)

const canSubmitAnswer = computed(() => {
  if (challengeStatus.value === ChallengeStatus.Upcoming) {
    return false
  }
  if (isAnswerLocked.value) {
    return false
  }
  return true
})

const challengeInputRestrictionMessage = computed(() => {
  if (challengeStatus.value === ChallengeStatus.Upcoming) {
    return 'This challenge opens soon. Check back when it starts to submit your answer.'
  }
  if (isAnswerLocked.value) {
    if (isChallengeRevealed.value) {
      return 'This challenge has been revealed and your answer is locked.'
    }
    if (isChallengeClosed.value) {
      return 'The challenge is closed and your submitted answer is locked in.'
    }
    return 'Answer updates are disabled for this challenge.'
  }
  return ''
})

const formattedRevealDate = computed(() => {
  const reveal = challengeRevealDate.value
  if (!reveal) return ''

  if (reveal.isValid) {
    return reveal.toLocal().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
  }

  return rawChallengeRevealAt.value ? new Date(rawChallengeRevealAt.value).toLocaleString() : ''
})

const statusIntroMessage = computed(() => {
  switch (challengeStatus.value) {
    case ChallengeStatus.Upcoming:
      return "This challenge isn't open just yet—hang tight!"
    case ChallengeStatus.Open:
      return "Take your best guess at what you've revealed!"
    case ChallengeStatus.Closed:
      return hasAnswered.value
        ? 'Thanks for locking in your answer!'
        : 'Challenge closed—drop an answer before the reveal to see how you stack up.'
    case ChallengeStatus.Revealed:
      return hasAnswered.value
        ? "The results are in—here's how you did."
        : 'Answer is available! Submit to see how you compare.'
    default:
      return "Take your best guess at what you've revealed!"
  }
})

const submissionMessage = computed(() => {
  if (!submissionResult.value) return ''
  if (isChallengeRevealed.value) {
    return submissionResult.value.isMatch
      ? 'You nailed it! 🎯 Correct answer locked in.'
      : "Close! We didn't auto-accept that answer—check the reveal to compare."
  }
  return submissionResult.value.isMatch
    ? 'Your answer was accepted! 🎉'
    : "Thanks! We didn't auto-accept that answer, but we'll review it alongside the reveal."
})

const submissionMessageClass = computed(() => {
  if (!submissionResult.value) return ''
  if (submissionResult.value.isMatch) {
    return 'has-text-success'
  }
  return isChallengeRevealed.value ? 'has-text-danger' : 'has-text-warning'
})

const revealedAnswer = computed(() => props.answerConfig?.solution?.trim() ?? '')

const revealedDistanceMessage = computed(() => {
  if (!isChallengeRevealed.value || !submissionResult.value) {
    return ''
  }
  const distance = submissionResult.value.distance
  if (distance === null || distance === undefined) {
    return ''
  }
  if (distance === 0) {
    return 'Perfect match—spot on!'
  }
  return `Edit distance from the accepted answer: ${distance}`
})

const submitButtonLabel = computed(() => {
  if (isAnswerLocked.value) {
    return 'Answer Locked'
  }
  return hasSubmitted.value ? 'Update Answer' : 'Submit Answer'
})

onMounted(() => {
  void attemptAutoSave()
  nowInterval = window.setInterval(() => {
    now.value = DateTime.now()
  }, 1_000)
})

onBeforeUnmount(() => {
  if (nowInterval !== null) {
    window.clearInterval(nowInterval)
    nowInterval = null
  }
})

watch(answer, (value) => {
  if (value !== lastHydratedAnswer.value) {
    hasUserEditedAnswer.value = true
  }
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

watch(
  [
    () => userStore.profile,
    () => props.gameId,
    () => dailyChallengeId.value
  ],
  () => {
    hydrateFromProfile()
  },
  { immediate: true }
)

watch(
  [
    () => props.score,
    () => globalBestScore.value,
    () => challengeBestScore.value,
    () => hasDailyChallenge.value
  ],
  () => {
    evaluateBestScoreFlag()
  },
  { immediate: true }
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
    console.log(
      `Skipping score save (${isDailyChallenge ? 'daily challenge' : 'standard mode'}): new score ${props.score} ` +
        `is not higher than existing score ${previousScore}.`
    )
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
  if (!canSubmitAnswer.value) {
    return
  }
  if (!answer.value.trim()) {
    return
  }

  const evaluation = evaluateSubmission(answer.value)
  await processSubmission(evaluation, 'submit_answer')
}

async function handleTryAgain() {
  // Blur any focused input
  const active = document.activeElement as HTMLElement | null
  if (active && typeof active.blur === 'function') {
    active.blur()
  }

  if (!userStore.user) {
    resetStateForNewAttempt()
    restartGame()
    return
  }

  if (!hasSubmitted.value) {
    await finalizeBlankSubmissionAndRestart()
    return
  }

  resetStateForNewAttempt()
  restartGame()
}

async function handleSkipSubmission() {
  if (!canSubmitAnswer.value) {
    return
  }

  await finalizeBlankSubmissionAndRestart()
}

async function handleRevealClaim() {
  if (!challengeReward.value) {
    return
  }

  await userStore.claimDailyChallengeReward({
    dailyChallengeId: challengeReward.value.dailyChallengeId,
    gameId: challengeReward.value.gameId,
  })
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
        lastHydratedAnswer.value = evaluation.originalAnswer
        hasUserEditedAnswer.value = false
        if (globalBestScore.value === null || props.score > globalBestScore.value) {
          globalBestScore.value = props.score
        }
        if (
          hasDailyChallenge.value &&
          (challengeBestScore.value === null || props.score > challengeBestScore.value)
        ) {
          challengeBestScore.value = props.score
        }
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

  hydrateFromProfile()
}

function parseChallengeDate(value?: string | null): DateTime | null {
  if (!value) return null
  const parsed = DateTime.fromISO(value, { zone: 'utc' })
  return parsed.isValid ? parsed : null
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

function hydrateFromProfile() {
  const gameData = storedGameData.value
  const challengeData = storedChallengeGameData.value
  const challengeProgress = storedChallengeProgress.value
  globalBestScore.value = typeof gameData?.score === 'number' ? gameData.score : null
  challengeBestScore.value = typeof challengeProgress?.bestScore === 'number' ? challengeProgress.bestScore : null

  const activeGameData = dailyChallengeId.value ? challengeData : gameData
  const customData = activeGameData?.custom ?? null

  const attemptMetadata = challengeProgress?.attemptMetadata
  const originalAnswerFromCustom = extractStringField(customData, [
    'originalAnswer',
    'original',
    'answer'
  ])
  const normalizedFromCustom = extractStringField(customData, [
    'normalizedAnswer',
    'normalized'
  ])
  const storedDistance = extractNumberOrNull(customData, 'distance', attemptMetadata?.distance)
  const storedIsMatch = extractBoolean(customData, 'isMatch', attemptMetadata?.isMatch ?? false)

  const hasAttempt = Boolean(originalAnswerFromCustom || attemptMetadata)

  if (!hasAttempt) {
    if (!hasSubmitted.value) {
      answer.value = ''
      lastHydratedAnswer.value = ''
      hasUserEditedAnswer.value = false
    }
    submissionResult.value = null
    hasSubmitted.value = false
    showLeaderboards.value = false
    evaluateBestScoreFlag()
    return
  }

  const normalizedAnswer =
    attemptMetadata?.normalizedAnswer ?? normalizedFromCustom ??
    (originalAnswerFromCustom ? normalizeZoneRevealAnswer(originalAnswerFromCustom) : '')

  const evaluation: ZoneRevealAnswerEvaluation = {
    originalAnswer: originalAnswerFromCustom ?? normalizedAnswer ?? '',
    normalizedAnswer,
    distance: typeof storedDistance === 'number' || storedDistance === null ? storedDistance : null,
    isMatch: storedIsMatch
  }

  submissionResult.value = evaluation
  hasSubmitted.value = true

  if (!hasUserEditedAnswer.value || !canSubmitAnswer.value) {
    answer.value = evaluation.originalAnswer
    lastHydratedAnswer.value = evaluation.originalAnswer
    hasUserEditedAnswer.value = false
  }

  showLeaderboards.value = true
  evaluateBestScoreFlag()
}

function resetStateForNewAttempt() {
  answer.value = ''
  hasSubmitted.value = false
  submissionResult.value = null
  lastHydratedAnswer.value = ''
  hasUserEditedAnswer.value = false
  showLeaderboards.value = false
}

function restartGame() {
  emit('close')

  // Slight delay to allow modal to unmount smoothly before restarting
  setTimeout(() => {
    window.dispatchEvent(new Event('restartGame'))
  }, 100)
}

async function processSubmission(
  evaluation: ZoneRevealAnswerEvaluation,
  analyticsAction: 'submit_answer' | 'skip_answer'
) {
  await saveScore(evaluation)
  hasSubmitted.value = true
  submissionResult.value = evaluation
  lastHydratedAnswer.value = evaluation.originalAnswer
  hasUserEditedAnswer.value = false
  showLeaderboards.value = true
  if (globalBestScore.value === null || props.score > globalBestScore.value) {
    globalBestScore.value = props.score
  }
  if (
    hasDailyChallenge.value &&
    (challengeBestScore.value === null || props.score > challengeBestScore.value)
  ) {
    challengeBestScore.value = props.score
  }
  evaluateBestScoreFlag()
  if (analytics) {
    logEvent(analytics, 'user_action', {
      action: analyticsAction,
      game_id: props.gameId,
      answer: evaluation.originalAnswer,
      normalized_answer: evaluation.normalizedAnswer,
      distance: evaluation.distance,
      is_match: evaluation.isMatch,
      daily_challenge_id: dailyChallengeId.value ?? undefined,
      daily_challenge_date: dailyChallengeDate.value ?? undefined
    })
  }

  hydrateFromProfile()
}

async function finalizeBlankSubmissionAndRestart() {
  if (!userStore.user) {
    resetStateForNewAttempt()
    restartGame()
    return
  }

  if (!canSubmitAnswer.value) {
    resetStateForNewAttempt()
    restartGame()
    return
  }

  const blankEvaluation = evaluateSubmission('')
  await processSubmission(blankEvaluation, 'skip_answer')
  resetStateForNewAttempt()
  restartGame()
}

function extractStringField(
  source: Record<string, unknown> | null | undefined,
  candidates: string[]
): string | undefined {
  if (!source) return undefined
  for (const key of candidates) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

function extractNumberOrNull(
  source: Record<string, unknown> | null | undefined,
  key: string,
  fallback?: number | null
): number | null | undefined {
  if (!source) return fallback
  const value = source[key]
  if (typeof value === 'number') {
    return value
  }
  if (value === null) {
    return null
  }
  return fallback
}

function extractBoolean(
  source: Record<string, unknown> | null | undefined,
  key: string,
  fallback: boolean
): boolean {
  if (!source) return fallback
  const value = source[key]
  if (typeof value === 'boolean') {
    return value
  }
  return fallback
}

function evaluateBestScoreFlag() {
  const globalBest = globalBestScore.value
  const challengeBest = challengeBestScore.value

  const betterThanGlobal = globalBest === null || props.score > globalBest
  const betterThanChallenge = hasDailyChallenge.value
    ? challengeBest === null || props.score > challengeBest
    : false

  if (hasDailyChallenge.value) {
    isNewBestScore.value = betterThanGlobal || betterThanChallenge
    return
  }

  isNewBestScore.value = betterThanGlobal
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
  inset-inline-end: 10px;
}

input {
  padding: 8px;
  margin: 10px 0;
  width: 100%;
}

.button.is-success {
  background-color: var(--color-accent);
  color: var(--color-text-on-primary);
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
  border: 1px solid var(--color-border-base);
}

.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.challenge-meta {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  text-align: start;
}

.challenge-meta__title {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  color: var(--color-text-primary);
}

.challenge-meta__item {
  margin: 0.25rem 0;
  color: var(--color-text-secondary);
}

.leaderboards {
  display: grid;
  gap: 1.5rem;
  margin-top: 2.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.action-buttons .button {
  width: 100%;
}

.answer-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.answer-panel .help {
  margin: 0;
}

.submission-status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.submission-status__countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background-color: var(--color-accent-bg);
  border: 1px solid var(--color-border-accent);
  color: var(--color-text-primary);
  font-weight: 600;
}

.submission-status__countdown-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.submission-status__countdown-timer {
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
}

.submitted-answer {
  margin-top: 1rem;
  font-style: italic;
  color: var(--color-text-secondary);
}

.submitted-answer__text {
  font-weight: 600;
}

.new-best-indicator {
  margin-bottom: 1rem;
}

.reveal-answer {
  font-weight: 600;
  color: var(--color-text-primary);
}

.reveal-answer__text {
  font-weight: 700;
}

.reveal-outcome {
  font-weight: 600;
}

.reveal-distance,
.reveal-date,
.reveal-followup {
  color: var(--color-text-secondary);
}

.reveal-claim {
  margin-top: 1rem;
}

.reveal-claim .button {
  min-width: 140px;
}

@media (min-width: 768px) {
  .leaderboards {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}
</style>

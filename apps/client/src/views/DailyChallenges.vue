<template>
  <div class="daily-page">
    <section class="daily-hero">
      <div class="daily-hero__glow"></div>
      <div class="daily-hero__content">
        <p class="daily-hero__pill">Daily drops</p>
        <h1 class="daily-hero__title">{{ gameTitle || 'Daily Challenges' }}</h1>
        <p class="daily-hero__subtitle">
          Jump into rotating challenges crafted by creators. New prompts keep your crew guessing every day.
        </p>
      </div>
    </section>

    <section class="daily-body">
      <div class="daily-surface">
        <header class="daily-surface__header">
          <h2>Select a challenge</h2>
          <p>Pick a card to launch the experience in a new tab.</p>
        </header>
        <div class="daily-content">
          <div class="daily-grid">
            <article
              v-for="challenge in challenges"
              :key="challenge.id"
              class="daily-card"
              :class="{ 'is-active': challenge.id === selectedChallengeId }"
              @click="selectChallenge(challenge.id)"
            >
              <div class="daily-card__header">
                <h3>{{ challenge.id }}</h3>
                <p>{{ challenge.description || 'Surprise the room with a fresh twist.' }}</p>
              </div>
              <div class="daily-card__footer">
                <button type="button" class="daily-card__cta" @click.stop="launchChallenge(challenge)">
                  Play
                </button>
              </div>
            </article>
          </div>
          <aside v-if="selectedChallenge" class="daily-detail">
            <header class="daily-detail__header">
              <h3>{{ selectedChallenge.id }}</h3>
              <p>{{ selectedChallenge.description || 'Take on the challenge and climb the board.' }}</p>
            </header>
            <dl class="daily-detail__meta">
              <div v-if="selectedChallengeAvailable">
                <dt>Available</dt>
                <dd>{{ selectedChallengeAvailable }}</dd>
              </div>
              <div v-if="selectedChallengeCloses">
                <dt>Closes</dt>
                <dd>{{ selectedChallengeCloses }}</dd>
              </div>
              <div v-if="selectedChallengeReveals">
                <dt>Reveal</dt>
                <dd>{{ selectedChallengeReveals }}</dd>
              </div>
            </dl>
            <div class="daily-detail__actions">
              <button type="button" class="daily-detail__play" @click="launchChallenge(selectedChallenge)">
                Launch challenge
              </button>
            </div>
            <Leaderboard
              :game-id="gameId"
              :daily-challenge-id="selectedChallengeId || undefined"
              title="Today's Standings"
            />
          </aside>
        </div>
        <p v-if="!challenges.length && hasLoaded" class="daily-empty">
          No daily challenges are available right now. Check back soon!
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, analytics, trackEvent } from '@top-x/shared';
import Leaderboard from '@/components/Leaderboard.vue';
import { DateTime } from 'luxon';

const route = useRoute();
const router = useRouter();
const gameId = ref<string>((route.query.game as string) || '');
const initialChallenge = route.query.challenge as string | undefined;
const selectedChallengeId = ref<string | null>(initialChallenge ?? null);
const challenges = ref<any[]>([]);
const gameTitle = ref('');
const hasLoaded = ref(false);

const selectedChallenge = computed(() =>
  challenges.value.find((challenge) => challenge.id === selectedChallengeId.value) || null,
);

const selectedChallengeSchedule = computed(() => selectedChallenge.value?.schedule || null);

useHead({
  title: 'Daily Challenges - TOP-X',
});

onMounted(async () => {
  if (!gameId.value) return;
  try {
    const gameDoc = await getDoc(doc(db, 'games', gameId.value));
    const gameTypeId = gameDoc.exists() ? ((gameDoc.data() as any).gameTypeId || '') : '';
    gameTitle.value = gameDoc.exists() ? (gameDoc.data() as any).name || 'Daily Challenges' : 'Daily Challenges';
    const snapshot = await getDocs(collection(db, 'games', gameId.value, 'daily_challenges'));
    challenges.value = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      route: `/games/${gameTypeId}?game=${gameId.value}&challenge=${d.id}`,
    }));
    if (!selectedChallengeId.value && challenges.value.length) {
      selectedChallengeId.value = challenges.value[0].id;
    }
  } catch (err) {
    console.error('Failed fetching challenges:', err);
  } finally {
    hasLoaded.value = true;
  }
});

watch(
  () => route.query.challenge,
  (nextChallenge) => {
    if (typeof nextChallenge === 'string') {
      selectedChallengeId.value = nextChallenge;
    }
  },
);

const selectedChallengeAvailable = computed(() =>
  formatDateTime(selectedChallengeSchedule.value?.availableAt),
);
const selectedChallengeCloses = computed(() =>
  formatDateTime(selectedChallengeSchedule.value?.closesAt),
);
const selectedChallengeReveals = computed(() =>
  formatDateTime(
    selectedChallengeSchedule.value?.revealAt || selectedChallenge.value?.answerRevealUTC,
  ),
);

function selectChallenge(challengeId: string) {
  selectedChallengeId.value = challengeId;
}

function launchChallenge(challenge: any) {
  if (!challenge?.route) return;
  if (challenge.id) {
    selectedChallengeId.value = challenge.id;
  }
  const idMatch = challenge.route.match(/game=([^&]+)/);
  const selectedGameId = idMatch ? idMatch[1] : 'unknown';
  trackEvent(analytics, 'select_game', {
    game_id: selectedGameId,
    daily_challenge_id: challenge.id,
  });
  router.push(challenge.route);
}

function formatDateTime(value?: string) {
  if (!value) return '';
  const parsed = DateTime.fromISO(value, { zone: 'utc' });
  if (parsed.isValid) {
    return parsed.toLocal().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
  }
  return new Date(value).toLocaleString();
}
</script>

<style scoped>
.daily-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(0, 232, 224, 0.2), transparent 55%),
    linear-gradient(180deg, rgba(5, 5, 5, 1) 0%, rgba(12, 12, 12, 1) 100%);
  color: #f8f8fc;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.daily-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.daily-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 25% 25%, rgba(0, 232, 224, 0.28), transparent 60%),
    radial-gradient(circle at 75% 15%, rgba(196, 255, 0, 0.18), transparent 60%);
  pointer-events: none;
}

.daily-hero__content {
  position: relative;
  width: min(760px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
  align-items: center;
}

.daily-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.daily-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.daily-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.1rem;
  line-height: 1.6;
}

.daily-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.daily-surface {
  width: min(960px, 100%);
  background: rgba(10, 10, 10, 0.72);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.daily-surface__header h2 {
  margin: 0;
  font-size: 1.75rem;
}

.daily-surface__header p {
  margin: 0.4rem 0 0;
  color: rgba(255, 255, 255, 0.65);
}


.daily-content {
  display: grid;
  gap: 1.5rem;
}

.daily-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.daily-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  padding: 1.5rem;
  border: 1px solid transparent;
  text-align: left;
  color: inherit;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.daily-card:hover,
.daily-card:focus,
.daily-card.is-active {
  transform: translateY(-4px);
  border-color: rgba(0, 232, 224, 0.45);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.35);
}

.daily-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.daily-card h3 {
  margin: 0;
  font-size: 1.3rem;
}

.daily-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.daily-card__footer {
  display: flex;
  justify-content: flex-end;
}

.daily-card__cta {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 232, 224, 0.45);
  background: transparent;
  color: rgba(0, 232, 224, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.daily-card__cta:hover,
.daily-card__cta:focus {
  background: rgba(0, 232, 224, 0.15);
  color: #000;
}

.daily-detail {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  border: 1px solid rgba(0, 232, 224, 0.25);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.daily-detail__header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.daily-detail__header p {
  margin: 0.5rem 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.daily-detail__meta {
  display: grid;
  gap: 0.75rem;
}

.daily-detail__meta dt {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.daily-detail__meta dd {
  margin: 0.15rem 0 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
}

.daily-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.daily-detail__play {
  padding: 0.65rem 1.4rem;
  border-radius: 12px;
  border: none;
  background: var(--bulma-primary);
  color: #000;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.daily-detail__play:hover,
.daily-detail__play:focus {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(0, 232, 224, 0.35);
}

.daily-detail :deep(.leaderboard-container) {
  margin-top: 0;
}

.daily-detail :deep(.card) {
  background: rgba(10, 10, 10, 0.85);
  border: 1px solid rgba(0, 232, 224, 0.15);
}

.daily-empty {
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 640px) {
  .daily-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .daily-content {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: start;
  }
}

.daily-empty {
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 640px) {
  .daily-grid {
    grid-template-columns: 1fr;
  }
}
</style>

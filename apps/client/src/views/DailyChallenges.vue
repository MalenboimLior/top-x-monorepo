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
        <div class="daily-grid">
          <button
            v-for="challenge in challenges"
            :key="challenge.id"
            type="button"
            class="daily-card"
            @click="openChallenge(challenge.route)"
          >
            <h3>{{ challenge.id }}</h3>
            <p>{{ challenge.description || 'Surprise the room with a fresh twist.' }}</p>
            <span class="daily-card__cta">Play</span>
          </button>
        </div>
        <p v-if="!challenges.length && hasLoaded" class="daily-empty">
          No daily challenges are available right now. Check back soon!
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, analytics, trackEvent } from '@top-x/shared';

const route = useRoute();
const router = useRouter();
const gameId = ref<string>((route.query.game as string) || '');
const challenges = ref<any[]>([]);
const gameTitle = ref('');
const hasLoaded = ref(false);

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
  } catch (err) {
    console.error('Failed fetching challenges:', err);
  } finally {
    hasLoaded.value = true;
  }
});

function openChallenge(challengeRoute: string) {
  const idMatch = challengeRoute.match(/game=([^&]+)/);
  const selectedGameId = idMatch ? idMatch[1] : 'unknown';
  trackEvent(analytics, 'select_game', { game_id: selectedGameId });
  router.push(challengeRoute);
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
  gap: 0.75rem;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.daily-card:hover,
.daily-card:focus {
  transform: translateY(-4px);
  border-color: rgba(0, 232, 224, 0.45);
  background: rgba(255, 255, 255, 0.06);
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

.daily-card__cta {
  margin-top: auto;
  font-weight: 600;
  color: var(--bulma-primary);
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

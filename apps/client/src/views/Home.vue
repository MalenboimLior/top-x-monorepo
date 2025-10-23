<!-- Home.vue -->
<template>
  <div class="home-page section-stack">
    <section class="hero layout-container">
      <div class="hero-content">
        <div class="hero-eyebrow">
          <span class="hero-pill">TOP-X</span>
          <span class="hero-eyebrow-text">{{ t('home.topGames') }}</span>
        </div>
        <h1 class="hero-title">Play, compete & celebrate together.</h1>
        <p class="hero-subtitle">{{ t('home.subtitle') }}</p>
        <div class="hero-actions">
          <CustomButton
            type="is-primary is-medium hero-button"
            :label="t('home.playNow')"
            @click="scrollToGames"
          />
          <button class="hero-link" type="button" @click="scrollToGames">
            Explore the collection
          </button>
        </div>
        <dl class="hero-stats">
          <div class="hero-stat">
            <dt>{{ activeGamesCount }}</dt>
            <dd>Active games</dd>
          </div>
          <div class="hero-stat">
            <dt>{{ filteredCommunityGames.length }}</dt>
            <dd>Community picks</dd>
          </div>
          <div class="hero-stat">
            <dt>{{ filteredAdminGames.length }}</dt>
            <dd>Featured titles</dd>
          </div>
        </dl>
      </div>
      <div class="hero-visual">
        <div class="hero-glow"></div>
        <img
          src="../assets/topx-logo.png"
          alt="TOP-X"
          class="hero-logo"
        />
      </div>
    </section>

    <section class="filter-panel layout-container">
      <div class="filter-card surface">
        <p class="filter-label">{{ t('home.filterLabel') }}</p>
        <div class="language-toggle responsive-flex-row" role="tablist" aria-label="Language filter">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            type="button"
            class="language-chip"
            :class="{ active: selectedLanguage === option.value }"
            :aria-pressed="selectedLanguage === option.value"
            @click="selectLanguage(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <section ref="gamesSection" class="game-section layout-container section-stack">
      <header class="section-header">
        <div>
          <h2 class="section-title">{{ t('home.topGames') }}</h2>
          <p class="section-subtitle">Curated experiences from the TOP-X team.</p>
        </div>
      </header>
      <div class="game-grid">
        <article
          v-for="game in filteredAdminGames"
          :key="game.id"
          class="game-card"
          @click="navigateToGame(game.id, game.gameTypeId)"
        >
          <div class="game-card__media">
            <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
          </div>
          <div class="game-card__content">
            <div class="game-card__meta responsive-flex-row">
              <span class="game-card__badge">Featured</span>
            </div>
            <h3 class="game-card__title">{{ game.name }}</h3>
            <p class="game-card__description">{{ game.description }}</p>
            <div class="game-card__footer">
              <CustomButton
                type="is-primary is-small"
                :label="t('home.playNow')"
                @click.stop="navigateToGame(game.id, game.gameTypeId)"
              />
            </div>
          </div>
        </article>
      </div>
      <p v-if="!filteredAdminGames.length" class="empty-state">No featured games yet — check back soon!</p>
    </section>

    <ins
      v-if="shouldDisplayAds"
      class="adsbygoogle"
      style="display:block; margin: 2rem auto;"
      :data-ad-client="adClient"
      :data-ad-slot="adSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>

    <section class="game-section layout-container section-stack">
      <header class="section-header">
        <div>
          <h2 class="section-title">{{ t('home.communityGames') }}</h2>
          <p class="section-subtitle">Built by players and shared with the community.</p>
        </div>
      </header>
      <div class="game-grid">
        <article
          v-for="game in filteredCommunityGames"
          :key="game.id"
          class="game-card"
          @click="navigateToGame(game.id, game.gameTypeId)"
        >
          <div class="game-card__media">
            <img :src="game.image" :alt="`${game.name} image`" loading="lazy" />
          </div>
          <div class="game-card__content">
            <div class="game-card__meta responsive-flex-row">
              <span class="game-card__badge game-card__badge--alt">Community</span>
              <span class="game-card__creator">{{ t('home.createdBy') }}: {{ game.creator?.username || t('home.unknownCreator') }}</span>
            </div>
            <h3 class="game-card__title">{{ game.name }}</h3>
            <p class="game-card__description">{{ game.description }}</p>
            <div class="game-card__footer">
              <CustomButton
                type="is-primary is-small"
                :label="t('home.playNow')"
                @click.stop="navigateToGame(game.id, game.gameTypeId)"
              />
            </div>
          </div>
        </article>
      </div>
      <p v-if="!filteredCommunityGames.length" class="empty-state">Community games will appear here once published.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import fallbackImg from '@/assets/images/fallback.png';
import { analytics, trackEvent } from '@top-x/shared';
import { Game } from '@top-x/shared/types/game';
import { useLocaleStore } from '@/stores/locale';
import { pushAdSenseSlot } from '@/utils/googleAdsense';

const router = useRouter();

const games = ref<Game[]>([]);
const selectedLanguage = ref('');
const gamesSection = ref<HTMLElement | null>(null);
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const adClient = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
const adSlot = import.meta.env.VITE_GOOGLE_ADS_SLOT_ID;
const shouldDisplayAds = computed(() => Boolean(adClient && adSlot));
const languageOptions = computed(() => [
  { label: t('home.filter.all'), value: '' },
  { label: t('home.filter.english'), value: 'en' },
  { label: t('home.filter.hebrew'), value: 'il' },
]);

useHead({
  title: 'TOP-X',
  meta: [
    {
      name: 'description',
      content: 'Play fun social games and compete with friends on TOP-X.',
    },
  ],
});

onMounted(() => {
  console.log('Home: Fetching games from Firestore...');
  trackEvent(analytics, 'page_view', { page_name: 'home' });
  const q = query(collection(db, 'games'));
  if (shouldDisplayAds.value) {
    nextTick(() => {
      pushAdSenseSlot();
    });
  }
  onSnapshot(
    q,
    (snapshot) => {
      games.value = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          console.log('Home: Game fetched:', { id: doc.id, data });
          return {
            id: doc.id,
            name: data.name || 'Unnamed Game',
            description: data.description || 'No description available',
            gameTypeId: data.gameTypeId || '',
            image: data.image || fallbackImg,
            active: data.active ?? false,
            language: data.language || 'en',
            shareLink: data.shareLink || '',
            community: data.community ?? false,
            creator: data.creator,
            gameHeader: data.gameHeader,
            gameInstruction: data.gameInstruction,
            vip: data.vip || [],
            custom: data.custom || {},
          } as Game;
        })
        .filter((g) => g.active);
      console.log('Home: Games updated:', games.value);
    },
    (err) => {
      console.error('Home: Error fetching games:', err.message, err);
    },
  );
});

watch(selectedLanguage, (language) => {
  if (language === 'il' || language === 'en') {
    void localeStore.setLanguage(language);
  }
});

const filteredAdminGames = computed(() => {
  return games.value.filter(
    (g) => !g.community && (!selectedLanguage.value || g.language === selectedLanguage.value),
  );
});

const filteredCommunityGames = computed(() => {
  return games.value.filter(
    (g) => g.community && (!selectedLanguage.value || g.language === selectedLanguage.value),
  );
});

const activeGamesCount = computed(() => games.value.length);

function navigateToGame(gameId: string, gameTypeId: string) {
  trackEvent(analytics, 'select_game', { game_id: gameId });
  router.push(`/games/info?game=${gameId}`);
}

function selectLanguage(language: string) {
  selectedLanguage.value = language;
}

function scrollToGames() {
  gamesSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<style scoped>
@import '../styles/Home.css';
</style>

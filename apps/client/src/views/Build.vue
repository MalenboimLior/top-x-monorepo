<template>
  <div class="build-page">
    <section class="build-hero">
      <div class="build-hero__glow"></div>
      <div class="build-hero__content">
        <p class="build-hero__pill">{{ content.hero.pill }}</p>
        <h1 class="build-hero__title">{{ content.hero.title }}</h1>
        <p class="build-hero__subtitle">{{ content.hero.subtitle }}</p>
        <div class="build-hero__stats" v-if="user">
          <div class="build-stat">
            <span class="build-stat__value">{{ availableGameTypes.length }}</span>
            <span class="build-stat__label">{{ content.stats.templatesLabel }}</span>
          </div>
          <div class="build-stat">
            <span class="build-stat__value">{{ myGames.length }}</span>
            <span class="build-stat__label">{{ content.stats.gamesLabel }}</span>
          </div>
        </div>
        <div v-else class="build-hero__cta">
          <p class="build-hero__reminder">{{ content.heroCta.reminder }}</p>
          <CustomButton type="is-primary is-medium" :label="content.heroCta.button" @click="login" />
        </div>
      </div>
    </section>

    <section v-if="!user" class="build-locked">
      <div class="build-card">
        <h2>{{ content.locked.title }}</h2>
        <p>{{ content.locked.body }}</p>
        <CustomButton type="is-primary" :label="content.locked.button" @click="login" />
      </div>
    </section>

    <section v-else class="build-body">
      <div v-if="!selectedGameType" class="build-dashboard">
        <div class="build-panel">
          <div class="build-panel__header">
            <h2>{{ content.templates.title }}</h2>
            <p>{{ content.templates.subtitle }}</p>
          </div>
          <div class="build-templates" role="list">
            <button
              v-for="gameType in availableGameTypes"
              :key="gameType.id"
              class="build-template"
              type="button"
              @click="selectGameType(gameType)"
            >
              <span class="build-template__name">{{ gameType.name }}</span>
              <span class="build-template__cta">Create</span>
            </button>
            <p v-if="!availableGameTypes.length" class="build-empty">{{ content.templates.empty }}</p>
          </div>
        </div>

        <div class="build-panel">
          <div class="build-panel__header">
            <h2>{{ content.games.title }}</h2>
            <p>{{ content.games.subtitle }}</p>
          </div>
          <div class="build-games">
            <div v-if="!myGames.length" class="build-empty">{{ content.games.empty }}</div>
            <div v-else class="build-games__list">
              <article v-for="game in myGames" :key="game.id" class="build-game-card">
                <header class="build-game-card__header">
                  <h3 class="build-game-card__title">{{ game.name }}</h3>
                  <span class="build-game-card__status" :class="{ 'is-live': game.active }">
                    {{ game.active ? 'Published' : 'Draft' }}
                  </span>
                </header>
                <p class="build-game-card__description">{{ game.description || 'No description yet.' }}</p>
                <footer class="build-game-card__actions">
                  <CustomButton type="is-primary is-small" label="Edit" @click="editGame(game)" />
                  <CustomButton
                    type="is-link is-small"
                    :label="content.games.open"
                    @click="openGame(game)"
                  />
                  <CustomButton
                    :type="game.active ? 'is-warning is-small' : 'is-success is-small'"
                    :label="game.active ? 'Unpublish' : 'Publish'"
                    @click="togglePublish(game)"
                  />
                </footer>
              </article>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedGameType" class="build-flow">
        <button class="build-flow__back" type="button" @click="handleCancel">
          {{ content.editor.back }}
        </button>
        <div class="build-flow__header">
          <h2>{{ editorHeading }}</h2>
          <p>
            {{ content.editor.subtitle }}
          </p>
        </div>
        <div class="build-flow__surface">
          <BuildAddNewGame
            :gameType="selectedGameType"
            :existingGame="selectedGame"
            @save="handleSave"
            @cancel="handleCancel"
          />
        </div>
      </div>

    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useHead } from '@vueuse/head';
import { useUserStore } from '@/stores/user';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import BuildAddNewGame from '@/components/build/BuildAddNewGame.vue';
import type { GameType, Game } from '@top-x/shared/types/game';
import { useLocaleStore } from '@/stores/locale';

const userStore = useUserStore();
const user = ref(userStore.user);
const availableGameTypes = ref<GameType[]>([]);
const myGames = ref<Game[]>([]);
const selectedGameType = ref<GameType | null>(null);
const selectedGame = ref<Game | null>(null);

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const defaultContent = computed(() => ({
  hero: {
    pill: t('build.hero.pill'),
    title: t('build.hero.title'),
    subtitle: t('build.hero.subtitle'),
  },
  heroCta: {
    reminder: t('build.hero.cta.reminder'),
    button: t('build.hero.cta.button'),
  },
  stats: {
    templatesLabel: t('build.stats.templates.label'),
    gamesLabel: t('build.stats.games.label'),
  },
  locked: {
    title: t('build.locked.title'),
    body: t('build.locked.body'),
    button: t('build.locked.button'),
  },
  templates: {
    title: t('build.templates.title'),
    subtitle: t('build.templates.subtitle'),
    empty: t('build.templates.empty'),
  },
  games: {
    title: t('build.games.title'),
    subtitle: t('build.games.subtitle'),
    empty: t('build.games.empty'),
    open: t('build.games.open'),
  },
  editor: {
    back: t('build.editor.back'),
    headingCreate: t('build.editor.heading.create'),
    headingEdit: t('build.editor.heading.edit'),
    subtitle: t('build.editor.subtitle'),
  },
}));

const seo = computed(() => ({
  title: t('build.meta.title'),
  description: t('build.meta.description'),
  keywords: t('build.meta.keywords'),
}));

const content = defaultContent;

const editorHeading = computed(() => {
  const templateName = selectedGameType.value?.name ?? '';
  const format = selectedGame.value ? content.value.editor.headingEdit : content.value.editor.headingCreate;
  return format.replace('{template}', templateName);
});

useHead(() => ({
  title: seo.value.title,
  meta: [
    {
      name: 'description',
      content: seo.value.description,
    },
    seo.value.keywords
      ? {
          name: 'keywords',
          content: seo.value.keywords,
        }
      : undefined,
  ].filter(Boolean) as { name: string; content: string }[],
}));

onMounted(() => {
  if (user.value) {
    fetchAvailableGameTypes();
    fetchMyGames();
  }
});

function fetchAvailableGameTypes() {
  const q = query(collection(db, 'gameTypes'), where('availableToBuild', '==', true));
  onSnapshot(
    q,
    (snapshot) => {
      availableGameTypes.value = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() } as GameType));
    },
    (err) => {
      console.error('Error fetching game types:', err);
    },
  );
}

function fetchMyGames() {
  if (!user.value?.uid) return;
  const q = query(collection(db, 'games'), where('creator.userid', '==', user.value.uid));
  onSnapshot(
    q,
    (snapshot) => {
      myGames.value = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() } as Game));
    },
    (err) => {
      console.error('Error fetching my games:', err);
    },
  );
}

function selectGameType(gameType: GameType) {
  selectedGameType.value = gameType;
  selectedGame.value = null;
}

function editGame(game: Game) {
  const gameType = availableGameTypes.value.find((type) => type.id === game.gameTypeId);
  if (gameType) {
    selectedGameType.value = gameType;
    selectedGame.value = game;
  } else {
    console.error('Game type not found for editing');
  }
}

async function togglePublish(game: Game) {
  try {
    const gameRef = doc(db, 'games', game.id);
    await updateDoc(gameRef, { active: !game.active });
  } catch (err) {
    console.error('Error toggling publish:', err);
  }
}

function openGame(game: Game) {
  if (!game.id || typeof window === 'undefined') {
    return;
  }
  window.open(`/games/info?game=${game.id}`, '_blank', 'noopener');
}

function handleSave() {
  selectedGameType.value = null;
  selectedGame.value = null;
}

function handleCancel() {
  selectedGameType.value = null;
  selectedGame.value = null;
}

async function login() {
  try {
    await userStore.loginWithX();
    user.value = userStore.user;
    if (user.value) {
      fetchAvailableGameTypes();
      fetchMyGames();
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}
</script>

<style scoped>
.build-page {
  background: radial-gradient(circle at top, rgba(0, 232, 224, 0.12), transparent 60%), #050505;
  min-height: 100vh;
  color: #f6f6f9;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.build-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 3rem;
  display: flex;
  justify-content: center;
}

.build-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 30%, rgba(0, 232, 224, 0.3), transparent 55%),
    radial-gradient(circle at 70% 20%, rgba(196, 255, 0, 0.2), transparent 60%);
  opacity: 0.9;
  pointer-events: none;
}

.build-hero__content {
  position: relative;
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
  align-items: center;
}

.build-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.build-hero__title {
  font-size: clamp(2.5rem, 2vw + 2rem, 3.75rem);
  margin: 0;
}

.build-hero__subtitle {
  max-width: 620px;
  margin: 0;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.6;
}

.build-hero__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.25rem;
  width: 100%;
}

.build-hero__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.build-hero__reminder {
  color: rgba(255, 255, 255, 0.72);
  margin: 0;
}

.build-stat {
  background: rgba(10, 10, 10, 0.65);
  border: 1px solid rgba(0, 232, 224, 0.18);
  border-radius: 20px;
  padding: 1.4rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.build-stat__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--bulma-primary);
}

.build-stat__label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.65);
}

.build-body {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 0 1.5rem 4rem;
}

.build-locked {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.build-card {
  width: min(520px, 100%);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  text-align: center;
}

.build-card p {
  color: rgba(255, 255, 255, 0.72);
  margin: 0;
}

.build-dashboard {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.build-panel {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: clamp(1.5rem, 2.5vw, 2.5rem);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.build-panel__header h2 {
  font-size: 1.6rem;
  margin: 0;
}

.build-panel__header p {
  margin: 0.5rem 0 0;
  color: rgba(255, 255, 255, 0.65);
}

.build-templates {
  display: grid;
  gap: 0.8rem;
}

.build-template {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  border-radius: 18px;
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.build-template:hover,
.build-template:focus {
  border-color: rgba(0, 232, 224, 0.5);
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.06);
}

.build-template__name {
  font-weight: 600;
}

.build-template__cta {
  color: var(--bulma-primary);
  font-weight: 600;
}

.build-empty {
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.build-games__list {
  display: grid;
  gap: 1.25rem;
}

.build-game-card {
  background: rgba(10, 10, 10, 0.7);
  border-radius: 22px;
  border: 1px solid rgba(0, 232, 224, 0.12);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.build-game-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.build-game-card__title {
  margin: 0;
  font-size: 1.2rem;
}

.build-game-card__status {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
}

.build-game-card__status.is-live {
  color: rgba(196, 255, 0, 0.9);
  border-color: rgba(196, 255, 0, 0.3);
}

.build-game-card__description {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.build-game-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.build-flow {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.build-flow__back {
  align-self: flex-start;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0;
}

.build-flow__header h2 {
  margin: 0;
}

.build-flow__header p {
  margin: 0.5rem 0 0;
  color: rgba(255, 255, 255, 0.6);
}

.build-flow__surface {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 28px;
  border: 1px solid rgba(0, 232, 224, 0.15);
  padding: clamp(1.5rem, 3vw, 3rem);
}

@media (max-width: 768px) {
  .build-hero__stats {
    grid-template-columns: 1fr;
  }

  .build-dashboard {
    grid-template-columns: 1fr;
  }

  .build-game-card__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

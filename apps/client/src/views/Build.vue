<template>
  <div class="page-container build-page">
    <!-- Hero Section (hidden when editing) -->
    <section v-if="!isEditing" class="build-hero">
      <div class="build-hero__content">
        <p class="build-hero__pill">{{ content.hero.pill }}</p>
        <h1 class="build-hero__title">{{ content.hero.title }}</h1>
        <p class="build-hero__subtitle">{{ content.hero.subtitle }}</p>
        <div v-if="!user" class="build-hero__cta">
          <p class="build-hero__reminder">{{ content.heroCta.reminder }}</p>
          <CustomButton type="is-primary is-medium" :label="content.heroCta.button" @click="login" />
        </div>
      </div>
    </section>

    <!-- Locked State (when not logged in) -->
    <section v-if="!user" class="build-locked">
      <div class="build-card">
        <h2>{{ content.locked.title }}</h2>
        <p>{{ content.locked.body }}</p>
        <CustomButton type="is-primary" :label="content.locked.button" @click="login" />
      </div>
    </section>

    <!-- Main Content (when logged in) -->
    <section v-else class="build-body">
      <!-- Dashboard View -->
      <div class="build-dashboard">
        <!-- Game Type Selection (BuildSection-like) -->
        <div class="build-panel build-panel--full">
          <div class="build-panel__header">
            <h2>{{ content.templates.title }}</h2>
            <p>{{ content.templates.subtitle }}</p>
          </div>
          <div class="build-templates-grid">
            <button
              v-for="gameType in availableGameTypes"
              :key="gameType.id"
              class="build-template-card"
              type="button"
              @click="selectGameType(gameType)"
            >
              <span class="build-template-card__icon" aria-hidden="true">
                <font-awesome-icon :icon="resolveIcon(gameType.id)" />
              </span>
              <span class="build-template-card__body">
                <span class="build-template-card__name">{{ gameType.name }}</span>
                <span v-if="gameType.description" class="build-template-card__description">
                  {{ gameType.description }}
                </span>
              </span>
              <span class="build-template-card__cta">
                {{ content.templates.cta }}
                <font-awesome-icon :icon="['fas', 'arrow-right']" />
              </span>
            </button>
            <p v-if="!availableGameTypes.length" class="build-empty">{{ content.templates.empty }}</p>
          </div>
        </div>

        <!-- My Games List -->
        <div class="build-panel build-panel--full">
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
                  <span class="build-game-card__status" :class="{ 'is-live': !game.unlisted }">
                    {{ !game.unlisted ? t('build.wizard.status.live') : t('build.wizard.status.draft') }}
                  </span>
                </header>
                <p class="build-game-card__description">{{ game.description || 'No description yet.' }}</p>
                <footer class="build-game-card__actions">
                  <CustomButton
                    type="is-primary is-small"
                    label="Edit"
                    :icon="['fas', 'edit']"
                    @click="editGame(game)"
                  />
                  <CustomButton
                    type="is-link is-small"
                    :label="content.games.open"
                    :icon="['fas', 'eye']"
                    @click="openGame(game)"
                  />
                  <div class="build-game-card__action-wrapper">
                    <CustomButton
                      type="is-light is-small"
                      :label="t('build.wizard.share')"
                      :icon="['fas', 'share']"
                      @click="handleShare(game)"
                    />
                    <div v-if="showShareSuccess === game.id" class="share-success-toast">
                      {{ t('build.wizard.shareSuccess') }}
                    </div>
                  </div>
                  <CustomButton
                    :type="!game.unlisted ? 'is-warning is-small' : 'is-success is-small'"
                    :label="!game.unlisted ? t('build.wizard.unpublish') : t('build.wizard.publish')"
                    :icon="!game.unlisted ? ['fas', 'eye-slash'] : ['fas', 'globe']"
                    @click="togglePublish(game)"
                  />
                  <CustomButton
                    type="is-danger is-small"
                    :label="content.games.delete"
                    :icon="['fas', 'trash']"
                    @click="confirmDelete(game)"
                  />
                </footer>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- Delete Confirmation Modal -->
    <div class="modal" :class="{ 'is-active': showDeleteModal }">
      <div class="modal-background" @click="showDeleteModal = false"></div>
      <div class="modal-content box">
        <h3 class="title is-4">{{ t('build.games.deleteConfirmTitle') || 'Delete game' }}</h3>
        <p>{{ gameToDelete ? t('build.wizard.deleteConfirm', { name: gameToDelete.name }) : t('build.games.deleteConfirm') }}</p>
        <div class="buttons mt-4">
          <CustomButton
            type="is-danger"
            :label="t('build.games.deleteConfirmButton') || 'Delete'"
            @click="performDelete"
          />
          <CustomButton
            type="is-light"
            :label="t('build.games.deleteCancel') || 'Cancel'"
            @click="showDeleteModal = false"
          />
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="showDeleteModal = false"></button>
    </div>

    <!-- Game Limit Modal -->
    <div class="modal" :class="{ 'is-active': showLimitModal }">
      <div class="modal-background" @click="showLimitModal = false"></div>
      <div class="modal-content box">
        <h3 class="title is-4">{{ t('build.games.limitReachedTitle') || 'Game limit reached' }}</h3>
        <p>{{ t('build.games.limitReached') || 'You\'ve reached the limit of 10 games. Please delete a game before creating a new one.' }}</p>
        <div class="buttons mt-4">
          <CustomButton
            type="is-primary"
            label="OK"
            @click="showLimitModal = false"
          />
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close" @click="showLimitModal = false"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import { useUserStore } from '@/stores/user';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { GameType, Game } from '@top-x/shared/types/game';
import { useLocaleStore } from '@/stores/locale';
import { deleteGame } from '@/services/game';
import { DEFAULT_GAME_TYPE_ICON, GAME_TYPE_ICON_MAP } from '@top-x/shared/constants/gameTypes';

const router = useRouter();
const userStore = useUserStore();
const user = computed(() => userStore.user);
const availableGameTypes = ref<GameType[]>([]);
const myGames = ref<Game[]>([]);
const showDeleteModal = ref(false);
const showLimitModal = ref(false);
const gameToDelete = ref<Game | null>(null);
const showShareSuccess = ref<string | null>(null);

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
  locked: {
    title: t('build.locked.title'),
    body: t('build.locked.body'),
    button: t('build.locked.button'),
  },
  templates: {
    title: t('build.templates.title'),
    subtitle: t('build.templates.subtitle'),
    empty: t('build.templates.empty'),
    cta: t('home.buildSection.cta') || 'Start building',
  },
  games: {
    title: t('build.games.title'),
    subtitle: t('build.games.subtitle'),
    empty: t('build.games.empty'),
    open: t('build.games.open'),
    delete: t('build.games.delete') || 'Delete',
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

function normalizeGameTypeId(value: string | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveIcon(gameTypeId: string | undefined) {
  const normalized = normalizeGameTypeId(gameTypeId);
  return GAME_TYPE_ICON_MAP[normalized] ?? DEFAULT_GAME_TYPE_ICON;
}

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
  // Check game limit
  if (myGames.value.length >= 10) {
    showLimitModal.value = true;
    return;
  }

  router.push(`/build/new/${gameType.id}`);
}

function editGame(game: Game) {
  if (!game.id) {
    console.error('Game ID is required for editing');
    return;
  }
  router.push(`/build/edit/${game.id}`);
}

async function togglePublish(game: Game) {
  try {
    const gameRef = doc(db, 'games', game.id);
    await updateDoc(gameRef, { unlisted: game.unlisted ?? false ? false : true });
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

async function handleShare(game: Game) {
  if (!game.id) {
    return;
  }
  
  const gameUrl = `${window.location.origin}/games/info?game=${game.id}`;
  try {
    await navigator.clipboard.writeText(gameUrl);
    showShareSuccess.value = game.id;
    setTimeout(() => {
      showShareSuccess.value = null;
    }, 3000);
  } catch (error) {
    console.error('Failed to copy link:', error);
    // Fallback: show the URL in a prompt
    prompt('Copy this link:', gameUrl);
  }
}

function confirmDelete(game: Game) {
  gameToDelete.value = game;
  showDeleteModal.value = true;
}

async function performDelete() {
  if (!gameToDelete.value?.id) return;
  
  try {
    const result = await deleteGame(gameToDelete.value.id);
    if (result.success) {
      showDeleteModal.value = false;
      gameToDelete.value = null;
    } else {
      console.error('Error deleting game:', result.error);
      alert(result.error || 'Failed to delete game');
    }
  } catch (err) {
    console.error('Error deleting game:', err);
    alert('Failed to delete game');
  }
}


async function login() {
  try {
    await userStore.loginWithX();
    if (userStore.user) {
      fetchAvailableGameTypes();
      fetchMyGames();
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}

// Watch for user changes to fetch data when user logs in
watch(
  () => userStore.user,
  (newUser) => {
    if (newUser) {
      fetchAvailableGameTypes();
      fetchMyGames();
    }
  },
);
</script>

<style scoped>
.build-page {
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
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
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
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.build-hero__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.build-hero__reminder {
  color: var(--color-text-secondary);
  margin: 0;
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
  background-color: var(--color-bg-card);
  border-radius: 24px;
  border: 1px solid var(--color-border-base);
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  text-align: center;
}

.build-card p {
  color: var(--color-text-secondary);
  margin: 0;
}

.build-dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.build-panel {
  background-color: var(--color-bg-card);
  border-radius: 28px;
  border: 1px solid var(--color-border-base);
  padding: clamp(1.5rem, 2.5vw, 2.5rem);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.build-panel--full {
  width: 100%;
}

.build-panel__header h2 {
  font-size: 1.6rem;
  margin: 0;
}

.build-panel__header p {
  margin: 0.5rem 0 0;
  color: var(--color-text-tertiary);
}

.build-templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(1rem, 3vw, 1.5rem);
}

.build-template-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1rem, 2.5vw, 1.5rem);
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: 28px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  color: var(--color-text-primary);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s ease, background-color 0.25s ease;
  overflow: hidden;
}

.build-template-card:hover,
.build-template-card:focus-visible {
  outline: none;
  border-color: var(--color-border-primary);
  background-color: var(--color-bg-card-hover);
}

.build-template-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(3.4rem, 8vw, 4.2rem);
  height: clamp(3.4rem, 8vw, 4.2rem);
  border-radius: 20px;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  font-size: clamp(1.35rem, 4vw, 1.6rem);
  color: var(--bulma-primary);
}

.build-template-card__body {
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 1.2vw, 0.7rem);
  align-items: center;
}

.build-template-card__name {
  font-size: clamp(1.2rem, 2.5vw, 1.4rem);
  font-weight: 700;
}

.build-template-card__description {
  color: var(--color-text-secondary);
  font-size: clamp(0.95rem, 2vw, 1.05rem);
  line-height: 1.55;
}

.build-template-card__cta {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.4rem, 1.1vw, 0.6rem);
  font-weight: 600;
  color: var(--color-accent);
  background-color: var(--color-accent-bg);
  border: 1px solid var(--color-border-accent);
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.build-empty {
  color: var(--color-text-tertiary);
  text-align: center;
  padding: 2rem;
}

.build-games__list {
  display: grid;
  gap: 1.25rem;
}

.build-game-card {
  background-color: var(--color-bg-card);
  border-radius: 22px;
  border: 1px solid var(--color-border-base);
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
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border-base);
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
}

.build-game-card__status.is-live {
  color: var(--color-accent);
  border-color: var(--color-border-accent);
}

.build-game-card__description {
  margin: 0;
  color: var(--color-text-secondary);
}

.build-game-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.build-game-card__action-wrapper {
  position: relative;
}

/* Share Success Toast */
.share-success-toast {
  position: absolute;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 100;
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
  border: 1px solid var(--color-border-base);
  font-size: 0.875rem;
  white-space: nowrap;
  animation: slideInDown 0.3s ease-out;
}

.share-success-toast::after {
  content: "";
  position: absolute;
  bottom: -8px;
  right: 20px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid var(--color-bg-elevated);
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0;
  transition: color 0.2s ease;
}

.build-flow__back:hover {
  color: var(--color-text-primary);
}

.build-flow__header h2 {
  margin: 0;
}

.build-flow__header p {
  margin: 0.5rem 0 0;
  color: var(--color-text-tertiary);
}

.build-flow__surface {
  background-color: var(--color-bg-card);
  border-radius: 28px;
  border: 1px solid var(--color-border-base);
  padding: clamp(1.5rem, 3vw, 3rem);
}

.default-configs-selection {
  width: 100%;
}

.default-configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.default-config-card {
  background-color: var(--color-bg-secondary);
  border: 2px solid var(--color-border-base);
  border-radius: 20px;
  padding: 1.5rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.default-config-card:hover,
.default-config-card:focus {
  border-color: var(--color-border-primary);
  background-color: var(--color-bg-card-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.default-config-card--scratch {
  border-style: dashed;
  border-color: var(--color-border-base);
}

.default-config-card--scratch:hover,
.default-config-card--scratch:focus {
  border-color: var(--color-border-primary);
}

.default-config-card__image {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--color-bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-config-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-config-card__image--placeholder {
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-accent-bg) 100%);
  color: var(--bulma-primary);
  font-size: 2.5rem;
  font-weight: 700;
}

.default-config-card__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.default-config-card__description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .build-dashboard {
    gap: 1.5rem;
  }

  .build-game-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .build-templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>

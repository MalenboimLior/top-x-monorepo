<template>
  <div class="page-container build-page">
    <section class="build-body">
      <div v-if="loading" class="build-flow">
        <div class="build-flow__surface">
          <p>{{ t('build.games.loading') || 'Loading game...' }}</p>
        </div>
      </div>
      <div v-else-if="error" class="build-flow">
        <div class="build-flow__surface">
          <p>{{ error }}</p>
          <CustomButton type="is-primary" :label="t('build.editor.back')" @click="handleBack" />
        </div>
      </div>
      <div v-else-if="game && gameType" class="build-flow">
        <button class="build-flow__back" type="button" @click="handleBack">
          {{ t('build.editor.back') }}
        </button>
        <div class="build-flow__header">
          <h2>{{ editorHeading }}</h2>
          <p>{{ t('build.editor.subtitle') }}</p>
        </div>
        <div class="build-flow__surface">
          <BuildAddNewGame
            :gameType="gameType"
            :existingGame="game"
            :selectedDefaultConfig="null"
            :selectedDefaultConfigImage="null"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import BuildAddNewGame from '@/components/build/BuildAddNewGame.vue';
import type { GameType, Game } from '@top-x/shared/types/game';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const game = ref<Game | null>(null);
const gameType = ref<GameType | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const gameId = computed(() => route.params.gameId as string);

const editorHeading = computed(() => {
  const templateName = gameType.value?.name ?? '';
  const format = t('build.editor.heading.edit');
  return format.replace('{template}', templateName);
});

const seo = computed(() => ({
  title: t('build.meta.title'),
  description: t('build.meta.description'),
  keywords: t('build.meta.keywords'),
}));

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

async function fetchGame() {
  if (!gameId.value) {
    error.value = 'Game ID is required';
    loading.value = false;
    return;
  }

  if (!userStore.user) {
    router.push('/build');
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    // Fetch game
    const gameDoc = await getDoc(doc(db, 'games', gameId.value));
    if (!gameDoc.exists()) {
      error.value = 'Game not found';
      loading.value = false;
      return;
    }

    const gameData = { id: gameDoc.id, ...gameDoc.data() } as Game;
    
    // Verify user owns this game
    if (gameData.creator?.userid !== userStore.user.uid) {
      error.value = 'You do not have permission to edit this game';
      loading.value = false;
      return;
    }

    game.value = gameData;

    // Fetch game type
    const gameTypeDoc = await getDoc(doc(db, 'gameTypes', gameData.gameTypeId));
    if (!gameTypeDoc.exists()) {
      error.value = 'Game type not found';
      loading.value = false;
      return;
    }

    gameType.value = { id: gameTypeDoc.id, ...gameTypeDoc.data() } as GameType;
    loading.value = false;
  } catch (err) {
    console.error('Error fetching game:', err);
    error.value = 'Failed to load game';
    loading.value = false;
  }
}

function handleBack() {
  router.push('/build');
}

onMounted(() => {
  if (!userStore.user) {
    router.push('/build');
    return;
  }
  fetchGame();
});

// Watch for route changes
watch(
  () => route.params.gameId,
  () => {
    fetchGame();
  },
);
</script>

<style scoped>
.build-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.build-body {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 0 1.5rem 4rem;
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
</style>


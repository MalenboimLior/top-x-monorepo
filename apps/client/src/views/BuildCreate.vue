<template>
  <div class="page-container build-page">
    <section class="build-body">
      <!-- Default Config Selection View -->
      <div v-if="showDefaultConfigSelection" class="build-flow">
        <button class="build-flow__back" type="button" @click="handleBack">
          {{ t('build.editor.back') }}
        </button>
        <div class="build-flow__header">
          <h2>{{ t('build.defaultConfigs.title') || 'Choose a Template' }}</h2>
          <p>{{ t('build.defaultConfigs.subtitle') || 'Select a template to start with, or create from scratch' }}</p>
        </div>
        <div class="build-flow__surface">
          <div class="default-configs-selection">
            <div class="default-configs-grid">
              <button
                v-for="defaultConfig in availableDefaultConfigs"
                :key="defaultConfig.name"
                class="default-config-card"
                type="button"
                @click="selectDefaultConfig(defaultConfig)"
              >
                <div v-if="defaultConfig.image" class="default-config-card__image">
                  <img :src="defaultConfig.image" :alt="defaultConfig.name" />
                </div>
                <div v-else class="default-config-card__image default-config-card__image--placeholder">
                  <span>{{ defaultConfig.name.charAt(0) }}</span>
                </div>
                <h3 class="default-config-card__title">{{ defaultConfig.name }}</h3>
                <p class="default-config-card__description">
                  {{ t('build.defaultConfigs.useTemplate') || 'Use this template' }}
                </p>
              </button>
              <button
                class="default-config-card default-config-card--scratch"
                type="button"
                @click="startFromScratch"
              >
                <div class="default-config-card__image default-config-card__image--placeholder">
                  <span>+</span>
                </div>
                <h3 class="default-config-card__title">{{ t('build.defaultConfigs.startFromScratch') || 'Start from Scratch' }}</h3>
                <p class="default-config-card__description">
                  {{ t('build.defaultConfigs.createEmpty') || 'Create an empty game' }}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Editor View -->
      <div v-else class="build-flow">
        <button class="build-flow__back" type="button" @click="handleBack">
          {{ t('build.editor.back') }}
        </button>
        <div class="build-flow__header">
          <h2>{{ editorHeading }}</h2>
          <p>{{ t('build.editor.subtitle') }}</p>
        </div>
        <div class="build-flow__surface">
          <BuildAddNewGame
            v-if="gameType"
            :gameType="gameType"
            :existingGame="null"
            :selectedDefaultConfig="selectedDefaultConfig"
            :selectedDefaultConfigImage="selectedDefaultConfigImage"
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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import BuildAddNewGame from '@/components/build/BuildAddNewGame.vue';
import type { GameType, GameCustomConfig } from '@top-x/shared/types/game';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const gameType = ref<GameType | null>(null);
const showDefaultConfigSelection = ref(false);
const selectedDefaultConfig = ref<GameCustomConfig | null>(null);
const selectedDefaultConfigImage = ref<string | null>(null);

const gameTypeId = computed(() => route.params.gameType as string);

const availableDefaultConfigs = computed(() => {
  if (!gameType.value?.defaultConfigs) {
    return [];
  }
  return [...gameType.value.defaultConfigs]
    .filter((dc) => dc.show)
    .sort((a, b) => a.order - b.order);
});

const editorHeading = computed(() => {
  const templateName = gameType.value?.name ?? '';
  const format = t('build.editor.heading.create');
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

function fetchGameType() {
  if (!gameTypeId.value) {
    router.push('/build');
    return;
  }

  const q = query(collection(db, 'gameTypes'), where('availableToBuild', '==', true));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const types = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() } as GameType));
      const foundType = types.find((type) => type.id === gameTypeId.value);
      
      if (foundType) {
        gameType.value = foundType;
        // Check if game type has default configs that should be shown
        const availableDefaults = foundType.defaultConfigs?.filter((dc) => dc.show) ?? [];
        showDefaultConfigSelection.value = availableDefaults.length > 0;
      } else {
        console.error('Game type not found:', gameTypeId.value);
        router.push('/build');
      }
    },
    (err) => {
      console.error('Error fetching game types:', err);
      router.push('/build');
    },
  );

  return unsubscribe;
}

function selectDefaultConfig(defaultConfig: { name: string; config: GameCustomConfig; image?: string }) {
  // Deep clone the config to avoid references
  selectedDefaultConfig.value = JSON.parse(JSON.stringify(defaultConfig.config));
  // Leave image empty when selecting a default config
  selectedDefaultConfigImage.value = null;
  showDefaultConfigSelection.value = false;
}

function startFromScratch() {
  selectedDefaultConfig.value = null;
  selectedDefaultConfigImage.value = null;
  showDefaultConfigSelection.value = false;
}

function handleBack() {
  router.push('/build');
}

onMounted(() => {
  if (!userStore.user) {
    router.push('/build');
    return;
  }
  fetchGameType();
});

// Watch for route changes
watch(
  () => route.params.gameType,
  () => {
    fetchGameType();
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
</style>


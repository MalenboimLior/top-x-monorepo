<template>
  <div class="game-builder">
    <!-- Section 1: Game Name -->
    <section class="builder-section">
      <div class="builder-section__header">
        <h2 class="builder-section__title">{{ t('build.game.fields.name.label') }}</h2>
        <p class="builder-section__hint">{{ t('build.game.fields.name.hint') }}</p>
      </div>
      <div class="builder-section__content">
        <input
          :id="ids.name"
          type="text"
          v-model="game.name"
          :placeholder="t('build.game.fields.name.placeholder')"
          class="game-name-input"
        />
      </div>
    </section>

    <!-- Section 2: Custom Config (Trivia/Pyramid/Zone) -->
    <section class="builder-section builder-section--no-frame">
      <AddTrivia
        v-if="props.gameType.custom === 'TriviaConfig'"
        v-model="(game.custom as TriviaConfig)"
        :gameId="validatedGameId"
      />
      <AddPyramid
        v-else-if="props.gameType.custom === 'PyramidConfig'"
        v-model="(game.custom as PyramidConfig)"
        :gameId="validatedGameId"
      />
      <AddZoneReveal
        v-else-if="props.gameType.custom === 'ZoneRevealConfig'"
        v-model="(game.custom as ZoneRevealConfig)"
      />
    </section>

    <!-- Section 3: Other Game Settings (Collapsible) -->
    <section class="builder-section">
      <button
        type="button"
        class="builder-section__toggle"
        @click="showGameSettings = !showGameSettings"
      >
        <span class="builder-section__toggle-title">{{ t('build.game.settings.title') || 'Game Settings' }}</span>
        <span class="builder-section__toggle-icon" :class="{ 'builder-section__toggle-icon--open': showGameSettings }">
          ▼
        </span>
      </button>

      <div v-if="showGameSettings" class="builder-section__content">
        <div class="settings-grid">
          <div class="field-block field-block--wide">
            <label :for="ids.description">{{ t('build.game.fields.description.label') }}</label>
            <textarea
              :id="ids.description"
              rows="3"
              v-model="game.description"
              :placeholder="t('build.game.fields.description.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.description.hint') }}</p>
          </div>

          <div class="field-block">
            <label :for="ids.language">{{ t('build.game.fields.language.label') }}</label>
            <select :id="ids.language" v-model="game.language">
              <option value="en">{{ t('build.game.fields.language.options.en') }}</option>
              <option value="il">{{ t('build.game.fields.language.options.il') }}</option>
            </select>
            <p class="field-hint">{{ t('build.game.fields.language.hint') }}</p>
          </div>

          <div class="field-block">
            <label>{{ t('build.game.fields.cover.label') }}</label>
            <ImageUploader
              v-model="game.image"
              :uploadFolder="`images/games/${validatedGameId}`"
              :cropWidth="512"
              :cropHeight="320"
            />
            <p class="field-hint">{{ t('build.game.fields.cover.hint') }}</p>
          </div>

          <div class="field-block">
            <label :for="ids.header">{{ t('build.game.fields.header.label') }}</label>
            <input
              :id="ids.header"
              type="text"
              v-model="game.gameHeader"
              :placeholder="t('build.game.fields.header.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.header.hint') }}</p>
          </div>

          <div class="field-block">
            <label :for="ids.shareText">{{ t('build.game.fields.shareText.label') }}</label>
            <input
              :id="ids.shareText"
              type="text"
              v-model="game.shareText"
              :placeholder="t('build.game.fields.shareText.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.shareText.hint') }}</p>
          </div>

          <div class="field-block field-block--wide">
            <label :for="ids.instructions">{{ t('build.game.fields.instructions.label') }}</label>
            <textarea
              :id="ids.instructions"
              rows="3"
              v-model="game.gameInstruction"
              :placeholder="t('build.game.fields.instructions.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.instructions.hint') }}</p>
          </div>

          <div class="field-block">
            <label :for="ids.shareLink">{{ t('build.game.fields.shareLink.label') }}</label>
            <input
              :id="ids.shareLink"
              type="text"
              v-model="game.shareLink"
              :placeholder="t('build.game.fields.shareLink.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.shareLink.hint') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer Actions -->
    <footer class="builder-footer">
      <div class="builder-footer__spacer"></div>
      <CustomButton
        type="is-primary is-light"
        :label="t('build.wizard.saveProgress')"
        :loading="isSaving"
        :disabled="isSaving"
        @click="saveGame({ stayOnWizard: true })"
      />
      <CustomButton
        type="is-primary"
        :loading="isSaving"
        :label="t('build.wizard.save')"
        @click="saveGame()"
      />
      <CustomButton type="is-light" :label="t('build.wizard.cancel')" @click="$emit('cancel')" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import GameCard from '@/components/GameCard.vue';
import AddPyramid from '@/components/build/AddPyramid.vue';
import AddZoneReveal from '@/components/build/AddZoneReveal.vue';
import AddTrivia from '@/components/build/AddTrivia.vue';
import { createGame, updateGame, getGames } from '@/services/game';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import type { Game, GameType, GameCustomConfig } from '@top-x/shared/types/game';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import type { TriviaConfig } from '@top-x/shared/types/trivia';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2300e8e0"/><stop offset="100%" stop-color="%23ff2d92"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="%23ffffff">TOP-X</text></svg>';

const props = defineProps<{
  gameType: GameType;
  existingGame?: Game | null;
  selectedDefaultConfig?: GameCustomConfig | null;
}>();

const emit = defineEmits(['save', 'cancel']);

const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);


const ids = {
  name: 'builder-game-name',
  description: 'builder-game-description',
  language: 'builder-game-language',
  header: 'builder-game-header',
  shareText: 'builder-game-share-text',
  instructions: 'builder-game-instructions',
  shareLink: 'builder-game-share-link',
} as const;

const isSaving = ref(false);
const showGameSettings = ref(false);

function generateRandomGameName(): string {
  const adjectives = ['Epic', 'Awesome', 'Cool', 'Amazing', 'Fantastic', 'Incredible', 'Super', 'Ultimate'];
  const nouns = ['Challenge', 'Game', 'Quiz', 'Trivia', 'Battle', 'Showdown', 'Contest', 'Match'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${randomAdjective} ${randomNoun} ${randomNum}`;
}

const validatedGameId = computed(() => {
  const source = props.existingGame?.id || `temp-${Date.now()}`;
  return source.replace(/[\\/]/g, '');
});

const initialGame = props.existingGame
  ? JSON.parse(JSON.stringify(props.existingGame))
  : {
      id: '',
      name: generateRandomGameName(),
      description: '',
      gameTypeId: props.gameType.id,
      active: false,
      language: 'en',
      image: '',
      vip: [],
      custom: props.selectedDefaultConfig
        ? JSON.parse(JSON.stringify(props.selectedDefaultConfig))
        : getDefaultCustom(props.gameType.custom),
      community: true,
      creator: {
        userid: userStore.user?.uid || '',
        username: userStore.profile?.username || '',
        image: userStore.user?.photoURL || userStore.profile?.photoURL || '',
      },
      gameHeader: '',
      shareText: '',
      gameInstruction: '',
      shareLink: '',
    } as Game;

const game = ref<Game>(initialGame);
const persistedGameId = ref(props.existingGame?.id ?? '');

const storageKey = computed(() => {
  if (typeof window === 'undefined') {
    return null;
  }
  const baseId = props.existingGame?.id || persistedGameId.value || 'new';
  return `build-draft-${props.gameType.id}-${baseId}`;
});

let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

function loadDraftFromCache(key = storageKey.value) {
  if (!key || typeof window === 'undefined') {
    return;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as { game?: Game; gameTypeId?: string };
    if (!parsed?.game || (parsed.gameTypeId && parsed.gameTypeId !== props.gameType.id)) {
      return;
    }
    const restored = JSON.parse(JSON.stringify(parsed.game)) as Game;
    game.value = {
      ...initialGame,
      ...restored,
      creator: restored.creator ?? initialGame.creator,
      custom: restored.custom ?? initialGame.custom,
    } as Game;
  } catch (error) {
    console.warn('Failed to restore builder draft', error);
  }
}

function saveDraftToCache(snapshot: Game) {
  const key = storageKey.value;
  if (!key || typeof window === 'undefined') {
    return;
  }
  try {
    const payload = {
      gameTypeId: props.gameType.id,
      timestamp: Date.now(),
      game: snapshot,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist builder draft', error);
  }
}

function clearDraftFromCache(key = storageKey.value) {
  if (!key || typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear builder draft', error);
  }
}

if (props.existingGame?.custom && 'levelsConfig' in props.existingGame.custom) {
  game.value.custom = withDefaultZoneRevealAnswer(
    JSON.parse(JSON.stringify(props.existingGame.custom)) as ZoneRevealConfig,
  );
} else if (props.existingGame?.custom && 'questions' in props.existingGame.custom) {
  game.value.custom = withDefaultTriviaConfig(
    JSON.parse(JSON.stringify(props.existingGame.custom)) as TriviaConfig,
  );
}
// Default config is already applied in initialGame

const gameTypeConfigTitle = computed(() => {
  if (props.gameType.custom === 'TriviaConfig') {
    return t('build.trivia.questions.stepTitle') || t('build.trivia.questions.title', { count: 0 });
  } else if (props.gameType.custom === 'PyramidConfig') {
    return t('build.pyramid.stepTitle') || 'Pyramid Configuration';
  } else if (props.gameType.custom === 'ZoneRevealConfig') {
    return t('build.zone.stepTitle') || 'Zone Reveal Configuration';
  }
  return 'Game Configuration';
});

const gameTypeConfigHint = computed(() => {
  if (props.gameType.custom === 'TriviaConfig') {
    return t('build.trivia.questions.subtitle') || 'Configure your trivia questions and settings';
  } else if (props.gameType.custom === 'PyramidConfig') {
    return 'Configure your pyramid game';
  } else if (props.gameType.custom === 'ZoneRevealConfig') {
    return 'Configure your zone reveal game';
  }
  return 'Configure your game';
});

async function saveGame(options: { stayOnWizard?: boolean } = {}) {
  const { stayOnWizard = false } = options;
  if (isSaving.value) {
    return;
  }

  try {
    isSaving.value = true;
    const payload = JSON.parse(JSON.stringify(game.value));
    const { id: _discardId, ...payloadWithoutId } = payload;
    const targetId = props.existingGame?.id || persistedGameId.value || undefined;

    if (targetId) {
      const result = await updateGame(targetId, payloadWithoutId);
      if (!result.success) {
        console.error('Error updating game:', result.error);
        alert(result.error || 'Failed to update game');
        return;
      }
    } else {
      // Check game limit before creating
      const userId = userStore.user?.uid;
      if (userId) {
        const gamesResult = await getGames({ creatorUserId: userId });
        if (gamesResult.games.length >= 10) {
          alert(t('build.games.limitReached') || 'You\'ve reached the limit of 10 games. Please delete a game before creating a new one.');
          return;
        }
      }
      
      const result = await createGame(payloadWithoutId);
      if (!result.gameId) {
        console.error('Error creating game:', result.error);
        alert(result.error || 'Failed to create game');
        return;
      }
      game.value.id = result.gameId;
      persistedGameId.value = result.gameId;
    }

    if (!stayOnWizard) {
      clearDraftFromCache();
      emit('save', JSON.parse(JSON.stringify(game.value)) as Game);
    }
  } catch (error) {
    console.error('Error saving game:', error);
  } finally {
    isSaving.value = false;
  }
}

const createDefaultAnswer = () => ({ solution: '', accepted: [] as string[], image: '' });

function withDefaultZoneRevealAnswer(config: ZoneRevealConfig): ZoneRevealConfig {
  const clone = JSON.parse(JSON.stringify(config)) as ZoneRevealConfig;
  if (!clone.answer) {
    clone.answer = createDefaultAnswer();
  } else {
    clone.answer.accepted = clone.answer.accepted ?? [];
  }
  return clone;
}

function getDefaultCustom(customType: string): PyramidConfig | ZoneRevealConfig | TriviaConfig {
  if (customType === 'PyramidConfig') {
    return {
      items: [],
      rows: [],
      sortItems: { orderBy: 'id', order: 'asc' },
      HideRowLabel: false,
      shareImageTitle: '',
      poolHeader: '',
      worstHeader: '',
      worstPoints: 0,
      worstShow: false,
      communityItems: [],
      communityHeader: '',
    };
  }
  if (customType === 'ZoneRevealConfig') {
    return withDefaultZoneRevealAnswer({
      levelsConfig: [],
      backgroundImage: '',
      spritesheets: {},
      playerSpeed: 0,
      enemiesSpeedArray: {},
      finishPercent: 0,
      heartIcon: '',
    });
  }
  if (customType === 'TriviaConfig') {
    return withDefaultTriviaConfig({
      mode: 'fixed',
      questions: [],
      language: '',
      globalTimer: { enabled: false },
      powerUps: [],
      theme: {},
      showCorrectAnswers: true,
      showCorrectAnswersOnEnd: true,
      powerUpsActive: false,
      allowRepeats: false,
      unlimitedLives: true,
      mustLogin: false,
    } as TriviaConfig);
  }
  throw new Error('Unknown custom type');
}

function withDefaultTriviaConfig(config: TriviaConfig): TriviaConfig {
  const clone = JSON.parse(JSON.stringify(config)) as TriviaConfig;
  clone.mode = 'fixed';
  clone.questions = clone.questions ?? [];
  clone.language = clone.language ?? '';
  clone.globalTimer = clone.globalTimer ?? { enabled: false };
  clone.theme = clone.theme ?? {};
  clone.powerUps = clone.powerUps ?? [];
  clone.powerUpsActive = clone.powerUpsActive ?? false;
  clone.allowRepeats = clone.allowRepeats ?? false;
  clone.unlimitedLives = clone.unlimitedLives ?? true;
  clone.showCorrectAnswers = clone.unlimitedLives ? clone.showCorrectAnswers ?? true : false;
  clone.showCorrectAnswersOnEnd = clone.unlimitedLives ? clone.showCorrectAnswersOnEnd ?? true : false;
  clone.mustLogin = clone.mustLogin ?? false;
  clone.lives = clone.unlimitedLives ? undefined : clone.lives ?? 3;
  return clone;
}

onMounted(() => {
  console.log('BuildAddNewGame mounted for', props.gameType.custom);
  loadDraftFromCache();
});

watch(
  () => props.gameType.id,
  () => {
    loadDraftFromCache();
  },
);

watch(
  () => game.value.id,
  (id, previous) => {
    if (id && id !== previous) {
      persistedGameId.value = id;
      clearDraftFromCache(`build-draft-${props.gameType.id}-new`);
    }
  },
  { immediate: true },
);

watch(
  storageKey,
  (newKey, oldKey) => {
    if (newKey) {
      loadDraftFromCache(newKey);
    }
  },
);

watch(
  game,
  (value) => {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }
    draftSaveTimer = setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(value)) as Game;
      saveDraftToCache(snapshot);
    }, 400);
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
  }
});
</script>

<style scoped>
.game-builder {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

.builder-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-section--no-frame {
  gap: 0;
}

.builder-section__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.builder-section__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.builder-section__hint {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  margin: 0;
}

.builder-section__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-section__toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.builder-section__toggle:hover {
  border-bottom-color: var(--color-border-medium);
}

.builder-section__toggle-title {
  color: var(--color-text-primary);
}

.builder-section__toggle-icon {
  transition: transform 0.2s ease;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.builder-section__toggle-icon--open {
  transform: rotate(180deg);
}

.game-name-input {
  width: 100%;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  transition: border-color 0.2s ease;
}

.game-name-input:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.game-name-input::placeholder {
  color: var(--color-text-tertiary);
}

.settings-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-block--wide {
  grid-column: 1 / -1;
}

.field-block label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.field-block input,
.field-block textarea,
.field-block select {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border-base);
  border-radius: var(--radius-sm);
  padding: 0.625rem 0.875rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.field-block input:focus,
.field-block textarea:focus,
.field-block select:focus {
  outline: none;
  border-color: var(--color-border-primary);
}

.field-block textarea {
  resize: vertical;
}

.field-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.builder-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1.5rem;
  margin-top: 1rem;
  border-top: 1px solid var(--color-border-subtle);
}

.builder-footer__spacer {
  flex: 1;
}

@media (max-width: 768px) {
  .game-builder {
    padding: 1.25rem;
  }

  .builder-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .builder-footer__spacer {
    display: none;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>

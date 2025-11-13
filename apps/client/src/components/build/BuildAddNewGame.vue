<template>
  <div class="builder-wizard">
    <header class="builder-wizard__progress">
      <div class="progress-meta">
        <span class="progress-meta__label">
          {{ t('build.wizard.stepLabel', { current: currentStepIndex + 1, total: wizardSteps.length }) }}
        </span>
        <span class="progress-meta__title">{{ currentStep.label }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="{ width: progressPercent }"></div>
      </div>
      <div class="progress-dots" role="list">
        <span
          v-for="(step, index) in wizardSteps"
          :key="step.key"
          role="listitem"
          :class="[
            'progress-dots__dot',
            { 'progress-dots__dot--active': index === currentStepIndex, 'progress-dots__dot--complete': index < currentStepIndex },
          ]"
        >
          {{ index + 1 }}
        </span>
      </div>
    </header>

    <section v-if="currentStep.key === 'game-info'" class="builder-panel">
      <div class="builder-panel__form">
        <div class="field-grid">
          <div class="field-block">
            <label :for="ids.name">{{ t('build.game.fields.name.label') }}</label>
            <input
              :id="ids.name"
              type="text"
              v-model="game.name"
              :placeholder="t('build.game.fields.name.placeholder')"
            />
            <p class="field-hint">{{ t('build.game.fields.name.hint') }}</p>
          </div>

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

      <aside class="builder-panel__preview">
        <div class="preview-card">
          <GameCard
            :game="previewGame"
            size="featured"
            :showFeaturedLabel="false"
            :playLabel="t('build.game.preview.play')"
            :buttonType="'is-primary'"
          />
          <dl class="preview-meta">
            <div class="preview-meta__creator">
              <dt>{{ t('build.game.preview.creatorLabel') || t('build.game.preview.creatorFallback') }}</dt>
              <dd class="preview-meta__creator-content">
                <img
                  v-if="previewGame.creator?.image"
                  :src="previewGame.creator.image"
                  alt=""
                  class="preview-meta__creator-avatar"
                />
                <span>{{ previewGame.creator?.username || t('build.game.preview.creatorFallback') }}</span>
              </dd>
            </div>
            <div>
              <dt>{{ t('build.game.preview.language') }}</dt>
              <dd>{{ languageLabel }}</dd>
            </div>
            <div>
              <dt>{{ t('build.game.preview.shareLink') }}</dt>
              <dd>{{ game.shareLink || t('build.game.preview.empty') }}</dd>
            </div>
            <div>
              <dt>{{ t('build.game.preview.header') }}</dt>
              <dd>{{ game.gameHeader || t('build.game.preview.empty') }}</dd>
            </div>
          </dl>
          <div v-if="gameInfoUrl" class="preview-card__actions">
            <CustomButton
              type="is-link is-small"
              :label="t('build.wizard.openGame')"
              @click="openGameInNewTab"
            />
          </div>
        </div>
      </aside>
    </section>

    <section v-else-if="currentStep.type === 'trivia'" class="builder-panel builder-panel--single">
      <AddTrivia
        v-model="(game.custom as TriviaConfig)"
        :gameId="validatedGameId"
        :activeStep="currentStep.triviaStep"
      />
    </section>

    <section v-else-if="currentStep.type === 'pyramid'" class="builder-panel builder-panel--single">
      <AddPyramid v-model="(game.custom as PyramidConfig)" :gameId="validatedGameId" />
    </section>

    <section v-else-if="currentStep.type === 'zone'" class="builder-panel builder-panel--single">
      <AddZoneReveal v-model="(game.custom as ZoneRevealConfig)" />
    </section>

    <footer class="builder-wizard__actions">
      <CustomButton
        type="is-light"
        :label="t('build.wizard.previous')"
        @click="goToPreviousStep"
        :disabled="isFirstStep"
      />
      <div class="builder-wizard__actions-spacer"></div>
      <CustomButton
        type="is-primary is-light"
        :label="t('build.wizard.saveProgress')"
        :loading="isSaving"
        :disabled="isSaving"
        @click="saveGame({ stayOnWizard: true })"
      />
      <CustomButton
        v-if="!isLastStep"
        type="is-primary"
        :label="t('build.wizard.next')"
        @click="goToNextStep"
      />
      <CustomButton
        v-else
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
import { createGame, updateGame } from '@/services/game';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import type { TriviaConfig } from '@top-x/shared/types/trivia';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2300e8e0"/><stop offset="100%" stop-color="%23ff2d92"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="%23ffffff">TOP-X</text></svg>';

const props = defineProps<{
  gameType: GameType;
  existingGame?: Game | null;
}>();

const emit = defineEmits(['save', 'cancel']);

const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

interface TriviaStepMeta {
  key: string;
  label: string;
  type: 'trivia';
  triviaStep: 'session' | 'questions' | 'theme';
}

interface CoreStepMeta {
  key: 'game-info';
  label: string;
  type: 'core';
}

interface PyramidStepMeta {
  key: string;
  label: string;
  type: 'pyramid';
}

interface ZoneStepMeta {
  key: string;
  label: string;
  type: 'zone';
}

type WizardStep = CoreStepMeta | TriviaStepMeta | PyramidStepMeta | ZoneStepMeta;

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
const currentStepIndex = ref(0);

const validatedGameId = computed(() => {
  const source = props.existingGame?.id || `temp-${Date.now()}`;
  return source.replace(/[\\/]/g, '');
});

const initialGame = props.existingGame
  ? JSON.parse(JSON.stringify(props.existingGame))
  : {
      id: '',
      name: '',
      description: '',
      gameTypeId: props.gameType.id,
      active: false,
      language: 'en',
      image: '',
      vip: [],
      custom: getDefaultCustom(props.gameType.custom),
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

const wizardSteps = computed<WizardStep[]>(() => {
  const steps: WizardStep[] = [
    {
      key: 'game-info',
      label: t('build.wizard.steps.gameInfo'),
      type: 'core',
    },
  ];

  if (props.gameType.custom === 'TriviaConfig') {
    steps.push(
      {
        key: 'trivia-questions',
        label: t('build.trivia.questions.stepTitle'),
        type: 'trivia',
        triviaStep: 'questions',
      },
      {
        key: 'trivia-session',
        label: t('build.trivia.session.stepTitle'),
        type: 'trivia',
        triviaStep: 'session',
      },
      {
        key: 'trivia-theme',
        label: t('build.trivia.theme.stepTitle'),
        type: 'trivia',
        triviaStep: 'theme',
      },
    );
  } else if (props.gameType.custom === 'PyramidConfig') {
    steps.push({ key: 'pyramid-config', label: t('build.pyramid.stepTitle'), type: 'pyramid' });
  } else if (props.gameType.custom === 'ZoneRevealConfig') {
    steps.push({ key: 'zone-config', label: t('build.zone.stepTitle'), type: 'zone' });
  }

  return steps;
});

watch(
  wizardSteps,
  (steps) => {
    if (!steps.length) {
      currentStepIndex.value = 0;
      return;
    }
    if (currentStepIndex.value >= steps.length) {
      currentStepIndex.value = steps.length - 1;
    }
  },
  { immediate: true },
);

const currentStep = computed(() => wizardSteps.value[currentStepIndex.value]);
const isFirstStep = computed(() => currentStepIndex.value === 0);
const isLastStep = computed(() => currentStepIndex.value === wizardSteps.value.length - 1);
const progressPercent = computed(() => `${((currentStepIndex.value + 1) / wizardSteps.value.length) * 100}%`);

const previewGame = computed<Game>(() => {
  const creator = game.value.creator || {
    userid: userStore.user?.uid || 'creator',
    username: userStore.profile?.username || t('build.game.preview.creatorFallback'),
    image: userStore.user?.photoURL || userStore.profile?.photoURL || '',
  };

  return {
    ...game.value,
    id: game.value.id || 'preview-game',
    name: game.value.name || t('build.game.preview.untitled'),
    description: game.value.description || t('build.game.preview.noDescription'),
    gameTypeId: props.gameType.id,
    image: game.value.image || FALLBACK_IMAGE,
    creator,
    community: game.value.community ?? true,
  };
});

const languageLabel = computed(() =>
  game.value.language === 'il'
    ? t('build.game.fields.language.options.il')
    : t('build.game.fields.language.options.en'),
);

function goToNextStep() {
  if (isLastStep.value) return;
  currentStepIndex.value += 1;
}

function goToPreviousStep() {
  if (isFirstStep.value) return;
  currentStepIndex.value -= 1;
}

const gameInfoUrl = computed(() =>
  game.value.id ? `/games/info?game=${game.value.id}` : null,
);

function openGameInNewTab() {
  if (gameInfoUrl.value && typeof window !== 'undefined') {
    window.open(gameInfoUrl.value, '_blank', 'noopener');
  }
}

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
        return;
      }
    } else {
      const result = await createGame(payloadWithoutId);
      if (!result.gameId) {
        console.error('Error creating game:', result.error);
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
.builder-wizard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  background: rgba(7, 7, 7, 0.85);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.builder-wizard__progress {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.progress-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.progress-meta__label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(0, 232, 224, 0.85);
}

.progress-meta__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
}

.progress-bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.progress-bar__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(0, 232, 224, 0.9), rgba(255, 45, 146, 0.9));
  border-radius: 999px;
  transition: width 0.35s ease;
}

.progress-dots {
  display: flex;
  gap: 0.75rem;
}

.progress-dots__dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 600;
  transition: all 0.25s ease;
}

.progress-dots__dot--active {
  border-color: rgba(0, 232, 224, 0.85);
  color: #ffffff;
  box-shadow: 0 0 12px rgba(0, 232, 224, 0.45);
}

.progress-dots__dot--complete {
  border-color: rgba(255, 255, 255, 0.65);
  color: rgba(255, 255, 255, 0.8);
}

.builder-panel {
  display: grid;
  gap: 2rem;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
}

.builder-panel--single {
  grid-template-columns: 1fr;
}

.builder-panel__form,
.builder-panel__preview {
  background: rgba(15, 15, 15, 0.75);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.field-grid {
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
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.6);
}

.field-block input,
.field-block textarea,
.field-block select {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-block input:focus,
.field-block textarea:focus,
.field-block select:focus {
  outline: none;
  border-color: rgba(0, 232, 224, 0.6);
  box-shadow: 0 0 0 1px rgba(0, 232, 224, 0.3);
}

.field-block textarea {
  resize: vertical;
}

.field-hint {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.preview-meta {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin: 0;
}

.preview-meta dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.preview-meta dd {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.preview-meta__creator-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-meta__creator-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.preview-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.builder-wizard__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.builder-wizard__actions-spacer {
  flex: 1;
}

@media (max-width: 1180px) {
  .builder-panel {
    grid-template-columns: 1fr;
  }

  .builder-panel__preview {
    order: -1;
  }
}

@media (max-width: 720px) {
  .builder-wizard {
    padding: 1.25rem;
  }

  .builder-wizard__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .builder-wizard__actions-spacer {
    display: none;
  }
}
</style>

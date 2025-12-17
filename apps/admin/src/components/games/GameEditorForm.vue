<template>
  <div class="game-editor-form">
    <div class="form-toolbar">
      <button class="button is-primary" :class="{ 'is-loading': isSaving }" @click="saveGame">
        {{ existingGame ? 'Save changes' : 'Create game' }}
      </button>
    </div>
    <div class="tabs is-boxed">
      <ul>
        <li :class="{ 'is-active': activeTab === 'general' }">
          <a @click="activeTab = 'general'">General</a>
        </li>
        <li :class="[{ 'is-active': activeTab === 'custom' }, { 'is-disabled': !hasCustomConfig }]">
          <a @click="selectCustomTab">Custom Config</a>
        </li>
      </ul>
    </div>

    <div v-if="activeTab === 'general'" class="columns is-multiline">
      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('name')">Game Name</label>
          <div class="control">
            <input
              :id="fieldId('name')"
              class="input"
              type="text"
              v-model="game.name"
              placeholder="Enter game name"
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('status')">Status</label>
          <label class="checkbox" :for="fieldId('status')">
            <input :id="fieldId('status')" type="checkbox" v-model="game.active" />
            Active
          </label>
        </div>
      </div>

      <div class="column is-full">
        <div class="field">
          <label class="label" :for="fieldId('description')">Description</label>
          <div class="control">
            <textarea
              :id="fieldId('description')"
              class="textarea"
              v-model="game.description"
              placeholder="Enter description"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label">Game Image</label>
          <ImageUploader
            v-model="game.image"
            :uploadFolder="`images/games/${validatedGameId}`"
            :cropWidth="1200"
            :cropHeight="800"
          />
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('language')">Language</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select :id="fieldId('language')" v-model="game.language">
                <option value="en">English</option>
                <option value="il">Hebrew</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('gameHeader')">Game Header</label>
          <div class="control">
            <input
              :id="fieldId('gameHeader')"
              class="input"
              type="text"
              v-model="game.gameHeader"
              placeholder="Enter game header"
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('shareText')">Share Text</label>
          <div class="control">
            <input
              :id="fieldId('shareText')"
              class="input"
              type="text"
              v-model="game.shareText"
              placeholder="Enter share text"
            />
          </div>
        </div>
      </div>

      <div class="column is-full">
        <div class="field">
          <label class="label" :for="fieldId('gameInstruction')">Game Instruction</label>
          <div class="control">
            <textarea
              :id="fieldId('gameInstruction')"
              class="textarea"
              v-model="game.gameInstruction"
              placeholder="Enter instructions"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('shareLink')">Share Link</label>
          <div class="control">
            <input
              :id="fieldId('shareLink')"
              class="input"
              type="text"
              v-model="game.shareLink"
              placeholder="Enter share link"
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('dailyChallengeActive')">Daily Challenge Active</label>
          <label class="checkbox" :for="fieldId('dailyChallengeActive')">
            <input :id="fieldId('dailyChallengeActive')" type="checkbox" v-model="game.dailyChallengeActive" />
            Enabled
          </label>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('community')">Community Game</label>
          <label class="checkbox" :for="fieldId('community')">
            <input :id="fieldId('community')" type="checkbox" v-model="game.community" />
            Community submissions enabled
          </label>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('creatorUserId')">Creator User ID</label>
          <div class="control">
            <input
              :id="fieldId('creatorUserId')"
              class="input"
              type="text"
              v-model="game.creator.userid"
              placeholder="Creator user id"
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('creatorUsername')">Creator Username</label>
          <div class="control">
            <input
              :id="fieldId('creatorUsername')"
              class="input"
              type="text"
              v-model="game.creator.username"
              placeholder="Creator username"
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label" :for="fieldId('vipList')">VIP Users (comma separated)</label>
          <div class="control">
            <input
              :id="fieldId('vipList')"
              class="input"
              type="text"
              v-model="vipList"
              placeholder="user1,user2"
            />
          </div>
        </div>
      </div>

      <div class="column is-full">
        <div class="field">
          <label class="label">Ad Configuration</label>
          <div class="field">
            <label class="label" :for="fieldId('adStrategy')">Ad Strategy</label>
            <div class="control">
              <div class="select is-fullwidth">
                <select :id="fieldId('adStrategy')" v-model="adStrategy">
                  <option value="no_ads">No Ads</option>
                  <option value="before_end">Before End Screen (Default)</option>
                  <option value="every_x_questions">Every X Questions</option>
                </select>
              </div>
            </div>
          </div>
          <div v-if="adStrategy === 'every_x_questions'" class="field mt-3">
            <label class="label" :for="fieldId('adInterval')">Show Ad Every X Questions</label>
            <div class="control">
              <input
                :id="fieldId('adInterval')"
                class="input"
                type="number"
                v-model.number="adInterval"
                min="1"
                placeholder="e.g. 3"
              />
            </div>
            <p class="help">Ad will be shown after every X questions</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="custom-config">
      <p v-if="!hasCustomConfig" class="has-text-grey">This game type has no custom configuration.</p>
      <AddPyramid
        v-else-if="gameType.custom === 'PyramidConfig'"
        v-model="game.custom as PyramidConfig"
        :gameId="existingGame?.id"
      />
      <AddZoneReveal v-else-if="gameType.custom === 'ZoneRevealConfig'" v-model="game.custom as ZoneRevealConfig" />
      <AddTrivia v-else-if="gameType.custom === 'TriviaConfig'" v-model="game.custom as TriviaConfig" :gameId="existingGame?.id" />
      <AddPacman v-else-if="gameType.custom === 'PacmanConfig'" v-model="game.custom as PacmanConfig" />
      <AddFisherGame v-else-if="gameType.custom === 'FisherGameConfig'" v-model="game.custom as FisherGameConfig" />
      <p v-else class="has-text-grey">Custom configuration for this game type is not yet supported.</p>
    </div>

    <div class="buttons mt-5">
      <button class="button is-primary" :class="{ 'is-loading': isSaving }" @click="saveGame">
        {{ existingGame ? 'Save changes' : 'Create game' }}
      </button>
      <button class="button" @click="$emit('cancel')">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import AddPyramid from '@/components/games/AddPyramid.vue';
import AddZoneReveal from '@/components/games/AddZoneReveal.vue';
import AddTrivia from '@/components/games/AddTrivia.vue';
import AddPacman from '@/components/games/AddPacman.vue';
import AddFisherGame from './AddFisherGame.vue';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { AdStrategy } from '@top-x/shared/types/game';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import type { PacmanConfig } from '@top-x/shared/types/pacman';
import type { FisherGameConfig } from '@top-x/shared/types/fisherGame';
import type { TriviaConfig } from '@top-x/shared/types/trivia';

const props = defineProps<{
  gameType: GameType;
  existingGame?: Game | null;
}>();

const emit = defineEmits(['saved', 'cancel', 'dirty-change']);

const activeTab = ref<'general' | 'custom'>('general');
const isSaving = ref(false);
const vipList = ref('');
const adStrategy = ref<AdStrategy>('before_end');
const adInterval = ref<number>(3);
const initialSnapshot = ref('');
const isDirty = ref(false);

const validatedGameId = computed(() => {
  const id = props.existingGame?.id || `temp-${Date.now()}`;
  return id.replace(/[\\/\\\\]/g, '');
});

function fieldId(suffix: string) {
  return `${validatedGameId.value}-${suffix}`;
}

const defaultGame = (): Game => ({
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
    userid: '',
    username: '',
  },
  gameHeader: '',
  shareText: '',
  gameInstruction: '',
  shareLink: '',
  dailyChallengeActive: false,
  adConfig: {
    strategy: 'before_end',
    interval: 3,
  },
});

const game = ref<Game>(defaultGame());

const hasCustomConfig = computed(() => Boolean(props.gameType?.custom));

watch(
  () => props.existingGame,
  (value) => {
    activeTab.value = 'general';
    if (value) {
      const clone = JSON.parse(JSON.stringify(value));
      clone.vip = clone.vip || [];
      clone.custom = clone.custom || getDefaultCustom(props.gameType.custom);
      if (isZoneRevealConfig(clone.custom)) {
        clone.custom = withDefaultZoneRevealAnswer(clone.custom);
      } else if (isTriviaConfig(clone.custom)) {
        clone.custom = withDefaultTriviaConfig(clone.custom);
      } else if (isPacmanConfig(clone.custom)) {
        clone.custom = withDefaultPacmanConfig(clone.custom);
      }
      clone.creator = clone.creator || { userid: '', username: '' };
      // Initialize adConfig if missing
      if (!clone.adConfig) {
        clone.adConfig = { strategy: 'before_end', interval: 3 };
      }
      game.value = clone;
      vipList.value = clone.vip?.join(',') ?? '';
      // Sync ad config to local state
      adStrategy.value = clone.adConfig?.strategy || 'before_end';
      adInterval.value = clone.adConfig?.interval || 3;
    } else {
      game.value = defaultGame();
      vipList.value = '';
      adStrategy.value = 'before_end';
      adInterval.value = 3;
    }
    nextTick(setInitialSnapshot);
  },
  { immediate: true },
);

watch(
  () => props.gameType,
  (value) => {
    if (!value) return;
    if (!props.existingGame) {
      game.value = defaultGame();
    } else {
      game.value.gameTypeId = value.id;
      if (!game.value.custom || Object.keys(game.value.custom).length === 0) {
        game.value.custom = getDefaultCustom(value.custom);
      } else if (isZoneRevealConfig(game.value.custom)) {
        game.value.custom = withDefaultZoneRevealAnswer(game.value.custom);
      } else if (isTriviaConfig(game.value.custom)) {
        game.value.custom = withDefaultTriviaConfig(game.value.custom);
      } else if (isPacmanConfig(game.value.custom)) {
        game.value.custom = withDefaultPacmanConfig(game.value.custom);
      }
    }
    nextTick(setInitialSnapshot);
  },
);

watch(
  vipList,
  (value) => {
    game.value.vip = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length);
  },
);

// Sync ad config changes to game object
watch(
  [adStrategy, adInterval],
  () => {
    if (!game.value.adConfig) {
      game.value.adConfig = { strategy: 'before_end', interval: 3 };
    }
    game.value.adConfig.strategy = adStrategy.value;
    game.value.adConfig.interval = adInterval.value;
  },
);

watch(
  [game, vipList, adStrategy, adInterval],
  () => {
    const next = snapshotState();
    updateDirty(next !== initialSnapshot.value);
  },
  { deep: true },
);

function createDefaultAnswer() {
  return { solution: '', accepted: [] as string[], image: '' };
}

function withDefaultZoneRevealAnswer(config: ZoneRevealConfig): ZoneRevealConfig {
  if (!config.answer) {
    config.answer = createDefaultAnswer();
  } else {
    config.answer.accepted = config.answer.accepted ?? [];
  }
  return config;
}

function isZoneRevealConfig(value: unknown): value is ZoneRevealConfig {
  return Boolean(value && typeof value === 'object' && 'levelsConfig' in value);
}

function isPacmanConfig(value: unknown): value is PacmanConfig {
  return Boolean(value && typeof value === 'object' && 'levels' in value && 'defaultScoring' in value);
}

function isTriviaConfig(value: unknown): value is TriviaConfig {
  return Boolean(value && typeof value === 'object' && 'questions' in value);
}

function defaultPacmanConfig(): PacmanConfig {
  return {
    version: 1,
    startingLives: 3,
    bonusLifeThresholds: [10000],
    allowWraparound: true,
    defaultScoring: {
      dotValue: 10,
      energizerValue: 50,
      ghostComboBase: 200,
      ghostComboIncrement: 200,
      fruitValues: [100, 300, 500],
      frightenedDurationMs: 6000,
    },
    enemies: [],
    powerUps: [],
    levels: [],
    speedSettings: {
      pacmanSpeed: 1,
      ghostSpeed: 1,
      frightenedSpeed: 0.8,
    },
    theme: 'classic',
  };
}

function withDefaultPacmanConfig(config: PacmanConfig): PacmanConfig {
  const defaults = defaultPacmanConfig();
  return {
    ...defaults,
    ...config,
    bonusLifeThresholds: config.bonusLifeThresholds ? [...config.bonusLifeThresholds] : [...defaults.bonusLifeThresholds],
    defaultScoring: {
      ...defaults.defaultScoring,
      ...(config.defaultScoring ?? defaults.defaultScoring),
      fruitValues: config.defaultScoring?.fruitValues
        ? [...config.defaultScoring.fruitValues]
        : [...defaults.defaultScoring.fruitValues],
    },
    speedSettings: {
      ...defaults.speedSettings!,
      ...(config.speedSettings ?? defaults.speedSettings),
    },
    enemies: config.enemies ? [...config.enemies] : [],
    powerUps: config.powerUps ? [...config.powerUps] : [],
    levels: config.levels ? [...config.levels] : [],
  };
}

function getDefaultCustom(
  customType?: string,
): PyramidConfig | ZoneRevealConfig | TriviaConfig | PacmanConfig | FisherGameConfig | Record<string, unknown> {
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
    } as PyramidConfig;
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
    } as ZoneRevealConfig);
  }
  if (customType === 'TriviaConfig') {
    return withDefaultTriviaConfig({
      mode: 'fixed',
      questions: [],
      language: 'en',
      globalTimer: { enabled: false },
      powerUps: [],
      theme: {},
      showCorrectAnswers: true,
    } as TriviaConfig);
  }
  if (customType === 'PacmanConfig') {
    return withDefaultPacmanConfig(defaultPacmanConfig());
  }
  if (customType === 'FisherGameConfig') {
    return {
      levelsConfig: [],
      backgroundImage: '',
      fishermanImage: '',
      hookSpeed: 100,
      offlineRate: 1,
    } as FisherGameConfig;
  }
  return {};
}

function withDefaultTriviaConfig(config: TriviaConfig): TriviaConfig {
  const clone = JSON.parse(JSON.stringify(config)) as TriviaConfig;
  clone.globalTimer = clone.globalTimer ?? { enabled: false };
  clone.theme = clone.theme ?? {};
  clone.powerUps = clone.powerUps ?? [];
  clone.questions = clone.questions ?? [];
  clone.language = clone.language ?? 'en';
  clone.questionSource = clone.questionSource ?? 'pool';
  if (clone.mode === 'endless') {
    clone.questionBatchSize = clone.questionBatchSize ?? 10;
    clone.lives = clone.lives ?? 3;
  } else {
    clone.mode = 'fixed';
  }
  return clone;
}

function selectCustomTab() {
  if (hasCustomConfig.value) {
    activeTab.value = 'custom';
  }
}

async function saveGame() {
  try {
    isSaving.value = true;
    const payload = JSON.parse(JSON.stringify(game.value));
    payload.gameTypeId = props.gameType.id;

    if (props.existingGame?.id) {
      const gameRef = doc(db, 'games', props.existingGame.id);
      await updateDoc(gameRef, payload);
    } else {
      const collectionRef = collection(db, 'games');
      await addDoc(collectionRef, payload);
    }

    setInitialSnapshot();
    emit('saved');
  } catch (error) {
    console.error('Failed to save game', error);
  } finally {
    isSaving.value = false;
  }
}

function snapshotState() {
  return JSON.stringify({ game: game.value, vipList: vipList.value });
}

function setInitialSnapshot() {
  initialSnapshot.value = snapshotState();
  isDirty.value = false;
  emit('dirty-change', false);
}

function updateDirty(value: boolean) {
  if (isDirty.value === value) {
    return;
  }
  isDirty.value = value;
  emit('dirty-change', value);
}
</script>

<style scoped>
.game-editor-form {
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
}

.form-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.tabs.is-boxed li.is-disabled a {
  pointer-events: none;
  opacity: 0.5;
}

.custom-config {
  padding: 1rem 0;
}

.buttons {
  display: flex;
  gap: 1rem;
}
</style>

<template>
  <form class="daily-challenge-form" @submit.prevent="save">
    <div class="form-toolbar">
      <button class="button is-primary" type="submit" :class="{ 'is-loading': isSaving }">
        Save challenge
      </button>
    </div>
    <div class="columns is-multiline">
      <div class="column is-one-quarter">
        <div class="field">
          <label class="label">Number</label>
          <div class="control">
            <input class="input" type="number" v-model.number="localChallenge.number" min="1" required />
          </div>
        </div>
      </div>
      <div class="column is-one-quarter">
        <div class="field">
          <label class="label">Date</label>
          <div class="control">
            <input class="input" type="date" v-model="localChallenge.date" required />
          </div>
        </div>
      </div>
      <div class="column is-one-quarter">
        <div class="field">
          <label class="label">Difficulty</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select v-model="localChallenge.difficulty">
                <option value="" disabled>Select difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="column is-one-quarter">
        <div class="field">
          <label class="label">Category</label>
          <div class="control">
            <input class="input" v-model="localChallenge.category" placeholder="e.g. logic" />
          </div>
        </div>
      </div>

      <div class="column is-one-third">
        <div class="field">
          <label class="label">Opens (UTC)</label>
          <div class="control">
            <input
              class="input"
              type="datetime-local"
              v-model="localChallenge.schedule.availableAt"
              required
            />
          </div>
        </div>
      </div>
      <div class="column is-one-third">
        <div class="field">
          <label class="label">Closes (UTC)</label>
          <div class="control">
            <input
              class="input"
              type="datetime-local"
              v-model="localChallenge.schedule.closesAt"
              required
            />
          </div>
        </div>
      </div>
      <div class="column is-one-third">
        <div class="field">
          <label class="label">Reveal (UTC)</label>
          <div class="control">
            <input
              class="input"
              type="datetime-local"
              v-model="localChallenge.schedule.revealAt"
              required
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label">Share text</label>
          <div class="control">
            <input class="input" v-model="localChallenge.shareText" placeholder="Today's puzzle is live!" />
          </div>
        </div>
      </div>
      <div class="column is-half">
        <div class="field">
          <label class="label">Discussion URL</label>
          <div class="control">
            <input class="input" v-model="localChallenge.discussionUrl" placeholder="https://" />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label">Show countdown</label>
          <label class="checkbox">
            <input type="checkbox" v-model="localChallenge.showCountdown" />
            Display countdown timer to reveal
          </label>
        </div>
      </div>
    </div>

    <div v-if="customType === 'PyramidConfig'" class="box mt-4">
      <AddPyramid v-model="localChallenge.custom as PyramidConfig" :gameId="game.id" />
    </div>
    <div v-else-if="customType === 'ZoneRevealConfig'" class="box mt-4">
      <AddZoneReveal v-model="localChallenge.custom as ZoneRevealConfig" :gameId="game.id" />
    </div>
    <div v-else-if="customType === 'TriviaConfig'" class="box mt-4">
      <AddTrivia v-model="localChallenge.custom as TriviaConfig" :gameId="game.id" />
    </div>

    <div class="buttons is-right mt-5">
      <button class="button" type="button" @click="emit('cancel')">Cancel</button>
      <button class="button is-primary" type="submit" :class="{ 'is-loading': isSaving }">Save challenge</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { Game } from '@top-x/shared/types/game';
import type { DailyChallenge, DailyChallengeSchedule } from '@top-x/shared/types/dailyChallenge';
import AddPyramid from '@/components/games/AddPyramid.vue';
import AddZoneReveal from '@/components/games/AddZoneReveal.vue';
import AddTrivia from '@/components/games/AddTrivia.vue';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import type { PacmanConfig } from '@top-x/shared/types/pacman';
import type { TriviaConfig } from '@top-x/shared/types/trivia';

const props = defineProps<{
  game: Game;
  challenge: (DailyChallenge & { id?: string }) | null;
}>();

const emit = defineEmits<{ (e: 'saved'): void; (e: 'cancel'): void; (e: 'dirty-change', value: boolean): void }>();

const isSaving = ref(false);
const initialSnapshot = ref('');
const isDirty = ref(false);

const customType = computed(() => {
  const custom = props.game.custom;
  if (isPacmanConfig(custom)) return 'PacmanConfig';
  if (isZoneRevealConfig(custom)) return 'ZoneRevealConfig';
  if (isTriviaConfig(custom)) return 'TriviaConfig';
  if (custom && typeof custom === 'object' && 'items' in custom) return 'PyramidConfig';
  return '';
});

const originalId = computed(() => props.challenge?.id || props.challenge?.date || '');

const localChallenge = ref<DailyChallenge>(mapChallenge(props.challenge));
setInitialSnapshot();

watch(
  () => props.challenge,
  (value) => {
    localChallenge.value = mapChallenge(value);
    nextTick(setInitialSnapshot);
  },
  { deep: true },
);

watch(
  localChallenge,
  () => {
    const next = snapshotState();
    updateDirty(next !== initialSnapshot.value);
  },
  { deep: true },
);

function createDefaultChallenge(): DailyChallenge {
  return {
    number: 1,
    date: '',
    createdAt: new Date().toISOString(),
    schedule: withDefaultSchedule(),
    custom: getDefaultCustom(customType.value),
    showCountdown: true,
  };
}

function createDefaultAnswer(): ZoneRevealConfig['answer'] {
  return { solution: '', accepted: [], image: '' };
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

function mapChallenge(challenge: (DailyChallenge & { id?: string }) | null): DailyChallenge {
  if (!challenge) {
    return createDefaultChallenge();
  }

  const { id: _ignoredId, ...rest } = challenge;

  let customConfig = challenge.custom || getDefaultCustom(customType.value);
  if (isZoneRevealConfig(customConfig)) {
    customConfig = withDefaultZoneRevealAnswer(customConfig);
  } else if (isTriviaConfig(customConfig)) {
    customConfig = withDefaultTriviaConfig(customConfig);
  } else if (isPacmanConfig(customConfig)) {
    customConfig = withDefaultPacmanConfig(customConfig);
  }

  return {
    ...rest,
    schedule: withDefaultSchedule(challenge.schedule),
    custom: customConfig,
  };
}

async function save() {
  if (!localChallenge.value.date) {
    return;
  }

  isSaving.value = true;
  try {
    const challengeId = localChallenge.value.date;
    const challengeRef = doc(db, 'games', props.game.id, 'daily_challenges', challengeId);

    await setDoc(challengeRef, {
      ...localChallenge.value,
      schedule: withDefaultSchedule(localChallenge.value.schedule),
      createdAt: localChallenge.value.createdAt || new Date().toISOString(),
    });

    if (originalId.value && originalId.value !== challengeId) {
      await deleteDoc(doc(db, 'games', props.game.id, 'daily_challenges', originalId.value));
    }

    setInitialSnapshot();
    emit('saved');
  } catch (error) {
    console.error('Failed to save daily challenge', error);
  } finally {
    isSaving.value = false;
  }
}

defineExpose({
  submit: save,
});

function snapshotState() {
  return JSON.stringify(localChallenge.value);
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

function getDefaultCustom(customType: string): PyramidConfig | ZoneRevealConfig | TriviaConfig | PacmanConfig {
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

  return {} as PyramidConfig;
}

function withDefaultSchedule(schedule?: DailyChallengeSchedule): DailyChallengeSchedule {
  return {
    availableAt: schedule?.availableAt ?? '',
    closesAt: schedule?.closesAt ?? '',
    revealAt: schedule?.revealAt ?? '',
  };
}
</script>

<style scoped>
.daily-challenge-form {
  padding: 0.5rem;
}

.form-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
</style>

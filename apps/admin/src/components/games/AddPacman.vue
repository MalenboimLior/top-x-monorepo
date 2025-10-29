<template>
  <div class="add-pacman">
    <h3 class="title is-4">Pacman Configuration</h3>

    <div class="field is-horizontal">
      <div class="field-body">
        <div class="field">
          <label class="label">Version</label>
          <input class="input" type="number" v-model.number="config.version" min="1" />
        </div>
        <div class="field">
          <label class="label">Starting Lives</label>
          <input class="input" type="number" v-model.number="config.startingLives" min="0" />
        </div>
        <div class="field">
          <label class="label">Allow Wraparound</label>
          <div class="control">
            <label class="checkbox">
              <input type="checkbox" v-model="config.allowWraparound" />
              Enable tunnel wraparound
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Bonus Life Thresholds</label>
      <div class="tags">
        <span
          v-for="(threshold, index) in config.bonusLifeThresholds"
          :key="`threshold-${index}`"
          class="tag is-info is-light"
        >
          {{ threshold }}
          <button class="delete is-small" @click="removeBonusThreshold(index)"></button>
        </span>
      </div>
      <div class="field has-addons">
        <div class="control is-expanded">
          <input class="input" type="number" v-model.number="newBonusThreshold" placeholder="Enter score" />
        </div>
        <div class="control">
          <button class="button is-link" @click.prevent="addBonusThreshold" :disabled="newBonusThreshold === null">
            Add
          </button>
        </div>
      </div>
    </div>

    <div class="box">
      <h4 class="title is-5">Default Scoring</h4>
      <div class="columns is-multiline">
        <div
          class="column is-one-quarter"
          v-for="field in scoringNumberFields"
          :key="field.key"
        >
          <label class="label">{{ field.label }}</label>
          <input class="input" type="number" v-model.number="config.defaultScoring[field.key]" />
        </div>
      </div>
      <div class="field">
        <label class="label">Fruit Values</label>
        <div class="tags">
          <span v-for="(value, index) in config.defaultScoring.fruitValues" :key="`fruit-${index}`" class="tag is-warning is-light">
            {{ value }}
            <button class="delete is-small" @click="removeFruitValue(index)"></button>
          </span>
        </div>
        <div class="field has-addons">
          <div class="control is-expanded">
            <input class="input" type="number" v-model.number="newFruitValue" placeholder="Enter fruit score" />
          </div>
          <div class="control">
            <button class="button is-link" @click.prevent="addFruitValue" :disabled="newFruitValue === null">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="box">
      <h4 class="title is-5">Speed Settings</h4>
      <div class="columns">
        <div class="column" v-for="field in speedFields" :key="field.key">
          <label class="label">{{ field.label }}</label>
          <input class="input" type="number" step="0.1" v-model.number="config.speedSettings[field.key]" />
        </div>
      </div>
      <div class="field">
        <label class="label">Theme</label>
        <div class="select is-fullwidth">
          <select v-model="config.theme">
            <option value="classic">Classic</option>
            <option value="neon">Neon</option>
            <option value="retro">Retro</option>
          </select>
        </div>
      </div>
    </div>

    <div class="box">
      <div class="level">
        <div class="level-left">
          <h4 class="title is-5">Global Enemies</h4>
        </div>
        <div class="level-right">
          <CustomButton type="is-success is-small" label="Add Enemy" @click="addEnemy" />
        </div>
      </div>
      <div v-if="!config.enemies.length" class="has-text-grey">No enemies defined yet.</div>
      <div v-for="(enemy, index) in config.enemies" :key="enemy.id || index" class="enemy-entry box">
        <div class="field is-horizontal">
          <div class="field-body">
            <div class="field">
              <label class="label">ID</label>
              <input class="input" v-model="enemy.id" placeholder="blinky" />
            </div>
            <div class="field">
              <label class="label">Name</label>
              <input class="input" v-model="enemy.name" placeholder="Blinky" />
            </div>
            <div class="field">
              <label class="label">Behavior</label>
              <div class="select is-fullwidth">
                <select v-model="enemy.behavior">
                  <option value="chaser">Chaser</option>
                  <option value="ambusher">Ambusher</option>
                  <option value="patroller">Patroller</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="label">Color</label>
              <input class="input" v-model="enemy.color" placeholder="#ff0000" />
            </div>
          </div>
        </div>
        <div class="columns is-multiline">
          <div class="column is-one-third">
            <label class="label">Scatter Target X</label>
            <input class="input" type="number" v-model.number="enemy.scatterTargetTile.x" />
          </div>
          <div class="column is-one-third">
            <label class="label">Scatter Target Y</label>
            <input class="input" type="number" v-model.number="enemy.scatterTargetTile.y" />
          </div>
          <div class="column is-one-third">
            <label class="label">Speed Multiplier</label>
            <input class="input" type="number" step="0.1" v-model.number="enemy.speedMultiplier" />
          </div>
          <div class="column is-one-third">
            <label class="label">Frightened Speed Multiplier</label>
            <input class="input" type="number" step="0.1" v-model.number="enemy.frightenedSpeedMultiplier" />
          </div>
          <div class="column is-one-third">
            <label class="label">Entry Delay (ms)</label>
            <input class="input" type="number" v-model.number="enemy.entryDelayMs" />
          </div>
        </div>
        <div class="has-text-right">
          <button class="button is-danger is-small" @click="removeEnemy(index)">Remove Enemy</button>
        </div>
      </div>
    </div>

    <div class="box">
      <div class="level">
        <div class="level-left">
          <h4 class="title is-5">Global Power-ups</h4>
        </div>
        <div class="level-right">
          <CustomButton type="is-success is-small" label="Add Power-up" @click="addPowerUp" />
        </div>
      </div>
      <div v-if="!config.powerUps.length" class="has-text-grey">No power-ups defined yet.</div>
      <div v-for="(powerUp, index) in config.powerUps" :key="powerUp.id || index" class="powerup-entry box">
        <div class="field is-horizontal">
          <div class="field-body">
            <div class="field">
              <label class="label">ID</label>
              <input class="input" v-model="powerUp.id" placeholder="energizer" />
            </div>
            <div class="field">
              <label class="label">Type</label>
              <div class="select is-fullwidth">
                <select v-model="powerUp.type">
                  <option value="energizer">Energizer</option>
                  <option value="fruit">Fruit</option>
                  <option value="speedBoost">Speed Boost</option>
                  <option value="shield">Shield</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="label">Duration (ms)</label>
              <input class="input" type="number" v-model.number="powerUp.durationMs" />
            </div>
            <div class="field">
              <label class="label">Spawn At (s)</label>
              <input class="input" type="number" v-model.number="powerUp.spawnAtSeconds" />
            </div>
            <div class="field">
              <label class="label">Points Awarded</label>
              <input class="input" type="number" v-model.number="powerUp.pointsAwarded" />
            </div>
            <div class="field">
              <label class="label">Max Active</label>
              <input class="input" type="number" v-model.number="powerUp.maxActive" />
            </div>
          </div>
        </div>
        <div class="has-text-right">
          <button class="button is-danger is-small" @click="removePowerUp(index)">Remove Power-up</button>
        </div>
      </div>
    </div>

    <div class="box">
      <div class="level">
        <div class="level-left">
          <h4 class="title is-5">Levels</h4>
        </div>
        <div class="level-right">
          <CustomButton type="is-success is-small" label="Add Level" @click="addLevel" />
        </div>
      </div>
      <div v-if="!config.levels.length" class="has-text-grey">No levels configured yet.</div>
      <div v-for="(level, levelIndex) in config.levels" :key="level.metadata.id || levelIndex" class="level-config box">
        <div class="field">
          <label class="label">Level {{ levelIndex + 1 }} Metadata</label>
          <div class="columns is-multiline">
            <div class="column is-one-quarter">
              <label class="label">ID</label>
              <input class="input" v-model="level.metadata.id" placeholder="level-1" />
            </div>
            <div class="column is-one-quarter">
              <label class="label">Name</label>
              <input class="input" v-model="level.metadata.name" placeholder="Stage 1" />
            </div>
            <div class="column is-one-quarter">
              <label class="label">Maze Layout ID</label>
              <input class="input" v-model="level.metadata.layoutId" placeholder="maze-classic" />
            </div>
            <div class="column is-one-quarter">
              <label class="label">Difficulty</label>
              <div class="select is-fullwidth">
                <select v-model="level.metadata.difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>
            </div>
            <div class="column is-half">
              <label class="label">Description</label>
              <input class="input" v-model="level.metadata.description" placeholder="Short description" />
            </div>
            <div class="column is-one-quarter">
              <label class="label">Designer</label>
              <input class="input" v-model="level.metadata.designer" placeholder="Level designer" />
            </div>
            <div class="column is-one-quarter">
              <label class="label">Release Date</label>
              <input class="input" type="date" v-model="level.metadata.releaseDate" />
            </div>
          </div>
        </div>

        <div class="columns is-multiline">
          <div class="column is-one-third">
            <label class="label">Dot Count</label>
            <input class="input" type="number" v-model.number="level.dotCount" />
          </div>
          <div class="column is-one-third">
            <label class="label">Energizer Count</label>
            <input class="input" type="number" v-model.number="level.energizerCount" />
          </div>
          <div class="column is-one-third">
            <label class="label">Frightened Duration (ms)</label>
            <input class="input" type="number" v-model.number="level.frightenedModeDurationMs" />
          </div>
          <div class="column is-one-third">
            <label class="label">Ghost Regeneration (ms)</label>
            <input class="input" type="number" v-model.number="level.ghostRegenerationMs" />
          </div>
        </div>

        <div class="field">
          <label class="label">Scatter/Chase Intervals</label>
          <div v-if="!level.scatterChaseIntervals?.length" class="has-text-grey">
            No scatter/chase intervals configured.
          </div>
          <div
            v-for="(interval, intervalIndex) in level.scatterChaseIntervals"
            :key="`interval-${intervalIndex}`"
            class="columns"
          >
            <div class="column">
              <label class="label">Scatter (ms)</label>
              <input class="input" type="number" v-model.number="interval.scatterMs" />
            </div>
            <div class="column">
              <label class="label">Chase (ms)</label>
              <input class="input" type="number" v-model.number="interval.chaseMs" />
            </div>
            <div class="column is-narrow">
              <button class="button is-danger is-small" @click="removeScatterChase(levelIndex, intervalIndex)">
                Remove
              </button>
            </div>
          </div>
          <CustomButton type="is-success is-small" label="Add Interval" @click="addScatterChase(levelIndex)" />
        </div>

        <div class="field">
          <label class="label">Enemy Overrides</label>
          <div v-if="!level.enemyOverrides?.length" class="has-text-grey">No overrides configured.</div>
          <div
            v-for="(enemy, enemyIndex) in level.enemyOverrides"
            :key="`level-${levelIndex}-enemy-${enemyIndex}`"
            class="box"
          >
            <div class="field is-horizontal">
              <div class="field-body">
                <div class="field">
                  <label class="label">Enemy ID</label>
                  <input class="input" v-model="enemy.id" placeholder="blinky" />
                </div>
                <div class="field">
                  <label class="label">Behavior</label>
                  <div class="select is-fullwidth">
                    <select v-model="enemy.behavior">
                      <option value="chaser">Chaser</option>
                      <option value="ambusher">Ambusher</option>
                      <option value="patroller">Patroller</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label class="label">Speed Multiplier</label>
                  <input class="input" type="number" step="0.1" v-model.number="enemy.speedMultiplier" />
                </div>
                <div class="field">
                  <label class="label">Entry Delay (ms)</label>
                  <input class="input" type="number" v-model.number="enemy.entryDelayMs" />
                </div>
              </div>
            </div>
            <div class="columns is-multiline">
              <div class="column is-one-third">
                <label class="label">Scatter X</label>
                <input class="input" type="number" v-model.number="enemy.scatterTargetTile.x" />
              </div>
              <div class="column is-one-third">
                <label class="label">Scatter Y</label>
                <input class="input" type="number" v-model.number="enemy.scatterTargetTile.y" />
              </div>
              <div class="column is-one-third">
                <label class="label">Frightened Speed</label>
                <input class="input" type="number" step="0.1" v-model.number="enemy.frightenedSpeedMultiplier" />
              </div>
            </div>
            <div class="has-text-right">
              <button class="button is-danger is-small" @click="removeEnemyOverride(levelIndex, enemyIndex)">
                Remove Override
              </button>
            </div>
          </div>
          <CustomButton type="is-success is-small" label="Add Enemy Override" @click="addEnemyOverride(levelIndex)" />
        </div>

        <div class="field">
          <label class="label">Level Power-ups</label>
          <div v-if="!level.powerUps?.length" class="has-text-grey">No level-specific power-ups.</div>
          <div v-for="(powerUp, powerIndex) in level.powerUps" :key="`level-${levelIndex}-power-${powerIndex}`" class="box">
            <div class="field is-horizontal">
              <div class="field-body">
                <div class="field">
                  <label class="label">Power-up ID</label>
                  <input class="input" v-model="powerUp.id" placeholder="fruit-1" />
                </div>
                <div class="field">
                  <label class="label">Type</label>
                  <div class="select is-fullwidth">
                    <select v-model="powerUp.type">
                      <option value="energizer">Energizer</option>
                      <option value="fruit">Fruit</option>
                      <option value="speedBoost">Speed Boost</option>
                      <option value="shield">Shield</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label class="label">Duration (ms)</label>
                  <input class="input" type="number" v-model.number="powerUp.durationMs" />
                </div>
                <div class="field">
                  <label class="label">Spawn At (s)</label>
                  <input class="input" type="number" v-model.number="powerUp.spawnAtSeconds" />
                </div>
                <div class="field">
                  <label class="label">Points</label>
                  <input class="input" type="number" v-model.number="powerUp.pointsAwarded" />
                </div>
                <div class="field">
                  <label class="label">Max Active</label>
                  <input class="input" type="number" v-model.number="powerUp.maxActive" />
                </div>
              </div>
            </div>
            <div class="has-text-right">
              <button class="button is-danger is-small" @click="removeLevelPowerUp(levelIndex, powerIndex)">Remove Power-up</button>
            </div>
          </div>
          <CustomButton type="is-success is-small" label="Add Level Power-up" @click="addLevelPowerUp(levelIndex)" />
        </div>

        <div class="buttons">
          <button class="button is-danger" @click="removeLevel(levelIndex)">Remove Level</button>
          <button class="button is-link" @click="duplicateLevel(levelIndex)">Duplicate Level</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type {
  PacmanConfig,
  PacmanEnemyEntry,
  PacmanLevelConfig,
  PacmanPowerUpEntry,
} from '@top-x/shared/types/pacman';

type ScoringFieldKey = keyof PacmanConfig['defaultScoring'];
type ScoringNumberFieldKey = Exclude<ScoringFieldKey, 'fruitValues'>;
type SpeedFieldKey = keyof NonNullable<PacmanConfig['speedSettings']>;

const props = defineProps<{ modelValue: PacmanConfig }>();
const emit = defineEmits(['update:modelValue']);

const scoringNumberFields: { key: ScoringNumberFieldKey; label: string }[] = [
  { key: 'dotValue', label: 'Dot Value' },
  { key: 'energizerValue', label: 'Energizer Value' },
  { key: 'ghostComboBase', label: 'Ghost Combo Base' },
  { key: 'ghostComboIncrement', label: 'Ghost Combo Increment' },
  { key: 'frightenedDurationMs', label: 'Frightened Duration (ms)' },
];

const speedFields: { key: SpeedFieldKey; label: string }[] = [
  { key: 'pacmanSpeed', label: 'Pacman Speed' },
  { key: 'ghostSpeed', label: 'Ghost Speed' },
  { key: 'frightenedSpeed', label: 'Frightened Speed' },
];

const config = ref<PacmanConfig>(defaultConfig());
const newBonusThreshold = ref<number | null>(null);
const newFruitValue = ref<number | null>(null);
let isSyncingFromProps = false;

watch(
  () => props.modelValue,
  (value) => {
    isSyncingFromProps = true;
    const next = normalizeConfig(value);
    config.value = JSON.parse(JSON.stringify(next));
    nextTick(() => {
      isSyncingFromProps = false;
    });
  },
  { deep: true, immediate: true },
);

watch(
  config,
  (value) => {
    if (isSyncingFromProps) return;
    emit('update:modelValue', JSON.parse(JSON.stringify(value)));
  },
  { deep: true },
);

function defaultConfig(): PacmanConfig {
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

function normalizeConfig(value?: PacmanConfig | null): PacmanConfig {
  const fallback = defaultConfig();
  return {
    ...fallback,
    ...(value ?? {}),
    theme: value?.theme ?? fallback.theme,
    bonusLifeThresholds: value?.bonusLifeThresholds ? [...value.bonusLifeThresholds] : [...fallback.bonusLifeThresholds],
    defaultScoring: {
      ...fallback.defaultScoring,
      ...(value?.defaultScoring ?? {}),
      fruitValues: value?.defaultScoring?.fruitValues
        ? [...value.defaultScoring.fruitValues]
        : [...fallback.defaultScoring.fruitValues],
    },
    speedSettings: {
      ...fallback.speedSettings!,
      ...(value?.speedSettings ?? {}),
    },
    enemies: (value?.enemies ?? []).map(normalizeEnemy),
    powerUps: (value?.powerUps ?? []).map(normalizePowerUp),
    levels: (value?.levels ?? []).map(normalizeLevel),
  };
}

function normalizeEnemy(enemy: PacmanEnemyEntry): PacmanEnemyEntry {
  return {
    ...enemy,
    scatterTargetTile: {
      x: enemy.scatterTargetTile?.x ?? 0,
      y: enemy.scatterTargetTile?.y ?? 0,
    },
  };
}

function normalizePowerUp(powerUp: PacmanPowerUpEntry): PacmanPowerUpEntry {
  return { ...powerUp };
}

function normalizeLevel(level: PacmanLevelConfig): PacmanLevelConfig {
  return {
    metadata: {
      id: level.metadata?.id ?? '',
      name: level.metadata?.name ?? '',
      layoutId: level.metadata?.layoutId ?? '',
      difficulty: level.metadata?.difficulty ?? 'easy',
      description: level.metadata?.description,
      designer: level.metadata?.designer,
      releaseDate: level.metadata?.releaseDate,
    },
    dotCount: level.dotCount ?? 0,
    energizerCount: level.energizerCount ?? 0,
    enemyOverrides: level.enemyOverrides?.map(normalizeEnemy) ?? [],
    powerUps: level.powerUps?.map(normalizePowerUp) ?? [],
    scatterChaseIntervals: level.scatterChaseIntervals?.map((interval) => ({
      scatterMs: interval.scatterMs ?? 0,
      chaseMs: interval.chaseMs ?? 0,
    })) ?? [],
    frightenedModeDurationMs: level.frightenedModeDurationMs,
    ghostRegenerationMs: level.ghostRegenerationMs,
  };
}

function addBonusThreshold() {
  if (newBonusThreshold.value === null) return;
  config.value.bonusLifeThresholds.push(newBonusThreshold.value);
  newBonusThreshold.value = null;
}

function removeBonusThreshold(index: number) {
  config.value.bonusLifeThresholds.splice(index, 1);
}

function addFruitValue() {
  if (newFruitValue.value === null) return;
  config.value.defaultScoring.fruitValues.push(newFruitValue.value);
  newFruitValue.value = null;
}

function removeFruitValue(index: number) {
  config.value.defaultScoring.fruitValues.splice(index, 1);
}

function addEnemy() {
  config.value.enemies.push(
    normalizeEnemy({
      id: '',
      name: '',
      behavior: 'chaser',
      scatterTargetTile: { x: 0, y: 0 },
    } as PacmanEnemyEntry),
  );
}

function removeEnemy(index: number) {
  config.value.enemies.splice(index, 1);
}

function addPowerUp() {
  config.value.powerUps.push({
    id: '',
    type: 'energizer',
  } as PacmanPowerUpEntry);
}

function removePowerUp(index: number) {
  config.value.powerUps.splice(index, 1);
}

function addLevel() {
  config.value.levels.push(
    normalizeLevel({
      metadata: {
        id: '',
        name: '',
        layoutId: '',
        difficulty: 'easy',
      },
      dotCount: 0,
      energizerCount: 0,
    } as PacmanLevelConfig),
  );
}

function duplicateLevel(index: number) {
  const level = config.value.levels[index];
  config.value.levels.splice(index + 1, 0, JSON.parse(JSON.stringify(level)) as PacmanLevelConfig);
}

function removeLevel(index: number) {
  config.value.levels.splice(index, 1);
}

function ensureLevelCollections(levelIndex: number) {
  const level = config.value.levels[levelIndex];
  if (!level.enemyOverrides) level.enemyOverrides = [];
  if (!level.powerUps) level.powerUps = [];
  if (!level.scatterChaseIntervals) level.scatterChaseIntervals = [];
}

function addEnemyOverride(levelIndex: number) {
  ensureLevelCollections(levelIndex);
  config.value.levels[levelIndex].enemyOverrides!.push(
    normalizeEnemy({
      id: '',
      name: '',
      behavior: 'chaser',
      scatterTargetTile: { x: 0, y: 0 },
    } as PacmanEnemyEntry),
  );
}

function removeEnemyOverride(levelIndex: number, enemyIndex: number) {
  config.value.levels[levelIndex].enemyOverrides?.splice(enemyIndex, 1);
}

function addLevelPowerUp(levelIndex: number) {
  ensureLevelCollections(levelIndex);
  config.value.levels[levelIndex].powerUps!.push({ id: '', type: 'energizer' } as PacmanPowerUpEntry);
}

function removeLevelPowerUp(levelIndex: number, powerIndex: number) {
  config.value.levels[levelIndex].powerUps?.splice(powerIndex, 1);
}

function addScatterChase(levelIndex: number) {
  ensureLevelCollections(levelIndex);
  config.value.levels[levelIndex].scatterChaseIntervals!.push({ scatterMs: 7000, chaseMs: 20000 });
}

function removeScatterChase(levelIndex: number, intervalIndex: number) {
  config.value.levels[levelIndex].scatterChaseIntervals?.splice(intervalIndex, 1);
}
</script>

<style scoped>
.add-pacman {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.enemy-entry,
.powerup-entry,
.level-config {
  margin-top: 1rem;
}

.buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>

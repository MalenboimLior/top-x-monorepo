<!-- Component for editing ZoneRevealConfig -->
<template>
  <div class="add-zone-reveal">
    <h3 class="title is-4 has-text-white">Zone Reveal Configuration</h3>

    <!-- Levels Config list -->
    <div class="field">
      <label class="label has-text-white">Levels</label>
      <div v-for="(level, levelIndex) in config.levelsConfig" :key="levelIndex" class="box mb-2">
        <div class="field">
          <label class="label has-text-grey-light">Level {{ levelIndex + 1 }}</label>
          <div class="field">
            <label class="label has-text-white">Time Limit</label>
            <input class="input" type="number" v-model="level.timeLimit" placeholder="Time Limit" />
          </div>
          <div class="field">
            <label class="label has-text-white">Hidden Image</label>
            <input class="input" v-model="level.hiddenImage" placeholder="Hidden Image URL" />
          </div>
          <div class="field">
            <label class="label has-text-white">Level Header</label>
            <input class="input" v-model="level.levelHeader" placeholder="Level Header" />
          </div>

          <!-- Enemy Config -->
          <div class="field">
            <label class="label has-text-grey-light">Enemies</label>
            <div v-for="(enemy, enemyIndex) in level.enemyConfig" :key="enemyIndex" class="columns mb-1">
              <div class="column">
                <input class="input" v-model="enemy.type" placeholder="Type" />
              </div>
              <div class="column">
                <input class="input" type="number" v-model="enemy.count" placeholder="Count" />
              </div>
              <div class="column is-narrow">
                <button class="button is-danger is-small" @click="removeEnemy(levelIndex, enemyIndex)">Remove</button>
              </div>
            </div>
            <CustomButton type="is-success is-small" label="Add Enemy" @click="addEnemy(levelIndex)" />
          </div>

          <!-- Powerup Config -->
          <div class="field">
            <label class="label has-text-grey-light">Powerups</label>
            <div v-for="(powerup, powerupIndex) in level.powerupConfig" :key="powerupIndex" class="columns mb-1">
              <div class="column">
                <input class="input" v-model="powerup.type" placeholder="Type" />
              </div>
              <div class="column">
                <input class="input" type="number" v-model="powerup.count" placeholder="Count" />
              </div>
              <div class="column is-narrow">
                <button class="button is-danger is-small" @click="removePowerup(levelIndex, powerupIndex)">Remove</button>
              </div>
            </div>
            <CustomButton type="is-success is-small" label="Add Powerup" @click="addPowerup(levelIndex)" />
          </div>

          <button class="button is-danger mt-2" @click="removeLevel(levelIndex)">Remove Level</button>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Level" @click="addLevel" />
    </div>

    <div class="field">
      <label class="label has-text-white">Background Image</label>
      <input class="input" v-model="config.backgroundImage" placeholder="Background Image URL" />
    </div>

    <!-- Spritesheets -->
    <div class="field" v-if="config.spritesheets">
      <label class="label has-text-white">Spritesheets</label>
      <div v-for="(value, key) in config.spritesheets" :key="key" class="columns mb-1">
        <div class="column">
          <input class="input" :value="key" disabled />
        </div>
        <div class="column">
          <input class="input" v-model="config.spritesheets[key]" placeholder="URL" />
        </div>
        <div class="column is-narrow">
          <button class="button is-danger is-small" @click="removeSpritesheet(key)">Remove</button>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <input class="input" v-model="newSpriteKey" placeholder="Key" />
        </div>
        <div class="column">
          <input class="input" v-model="newSpriteValue" placeholder="URL" />
        </div>
        <div class="column is-narrow">
          <CustomButton type="is-success is-small" label="Add" @click="addSpritesheet" :disabled="!newSpriteKey || !newSpriteValue" />
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label has-text-white">Player Speed</label>
      <input class="input" type="number" v-model="config.playerSpeed" placeholder="Player Speed" />
    </div>

    <!-- Enemies Speed Array -->
    <div class="field" v-if="config.enemiesSpeedArray">
      <label class="label has-text-white">Enemies Speeds</label>
      <div v-for="(value, key) in config.enemiesSpeedArray" :key="key" class="columns mb-1">
        <div class="column">
          <input class="input" :value="key" disabled />
        </div>
        <div class="column">
          <input class="input" type="number" v-model="config.enemiesSpeedArray[key]" placeholder="Speed" />
        </div>
        <div class="column is-narrow">
          <button class="button is-danger is-small" @click="removeEnemySpeed(key)">Remove</button>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <input class="input" v-model="newEnemyKey" placeholder="Key" />
        </div>
        <div class="column">
          <input class="input" type="number" v-model="newEnemyValue" placeholder="Speed" />
        </div>
        <div class="column is-narrow">
          <CustomButton type="is-success is-small" label="Add" @click="addEnemySpeed" :disabled="!newEnemyKey || !newEnemyValue" />
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label has-text-white">Finish Percent</label>
      <input class="input" type="number" v-model="config.finishPercent" placeholder="Finish Percent" />
    </div>

    <div class="field">
      <label class="label has-text-white">Heart Icon</label>
      <input class="input" v-model="config.heartIcon" placeholder="Heart Icon URL" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { ZoneRevealConfig, LevelConfig, EnemyConfig, PowerupConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{ modelValue: ZoneRevealConfig }>();
const emit = defineEmits(['update:modelValue']);

const config = ref<ZoneRevealConfig>({
  levelsConfig: [],
  backgroundImage: '',
  spritesheets: {},
  playerSpeed: 0,
  enemiesSpeedArray: {},
  finishPercent: 0,
  heartIcon: '',
});

const newSpriteKey = ref('');
const newSpriteValue = ref('');
const newEnemyKey = ref('');
const newEnemyValue = ref(0);

watch(() => props.modelValue, (val) => { config.value = val; }, { deep: true });
watch(config, (val) => { emit('update:modelValue', val); }, { deep: true });

function addLevel() {
  config.value.levelsConfig.push({
    enemyConfig: [],
    powerupConfig: [],
    timeLimit: 0,
    hiddenImage: '',
    levelHeader: '',
  });
}

function removeLevel(index: number) {
  config.value.levelsConfig.splice(index, 1);
}

function addEnemy(levelIndex: number) {
  config.value.levelsConfig[levelIndex].enemyConfig.push({ type: '', count: 0 });
}

function removeEnemy(levelIndex: number, enemyIndex: number) {
  config.value.levelsConfig[levelIndex].enemyConfig.splice(enemyIndex, 1);
}

function addPowerup(levelIndex: number) {
  config.value.levelsConfig[levelIndex].powerupConfig.push({ type: '', count: 0 });
}

function removePowerup(levelIndex: number, powerupIndex: number) {
  config.value.levelsConfig[levelIndex].powerupConfig.splice(powerupIndex, 1);
}

function addSpritesheet() {
  if (newSpriteKey.value && newSpriteValue.value) {
    config.value.spritesheets = { ...(config.value.spritesheets ?? {}), [newSpriteKey.value]: newSpriteValue.value };
    newSpriteKey.value = '';
    newSpriteValue.value = '';
  }
}

function removeSpritesheet(key: string) {
  const spritesheets = config.value.spritesheets ?? {};
  const { [key]: _, ...rest } = spritesheets;
  config.value.spritesheets = rest;
}

function addEnemySpeed() {
  if (newEnemyKey.value && newEnemyValue.value) {
    config.value.enemiesSpeedArray = { ...(config.value.enemiesSpeedArray ?? {}), [newEnemyKey.value]: newEnemyValue.value };
    newEnemyKey.value = '';
    newEnemyValue.value = 0;
  }
}

function removeEnemySpeed(key: string) {
  const enemiesSpeedArray = config.value.enemiesSpeedArray ?? {};
  const { [key]: _, ...rest } = enemiesSpeedArray;
  config.value.enemiesSpeedArray = rest;
}
</script>

<style scoped>
.add-zone-reveal {
  margin-top: 1rem;
}
</style>
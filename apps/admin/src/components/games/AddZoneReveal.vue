<template>
  <div class="add-zone-reveal">
    <h3 class="title is-4">Zone Reveal Configuration</h3>

    <!-- Levels Config list -->
    <div class="field">
      <label class="label">Levels</label>
      <div v-for="(level, levelIndex) in config.levelsConfig" :key="levelIndex" class="box mb-2">
        <div class="field">
          <label class="label">Level {{ levelIndex + 1 }}</label>
          <div class="field">
            <label class="label">Time Limit</label>
            <input class="input" type="number" v-model.number="level.timeLimit" placeholder="Time Limit" />
          </div>
          <div class="field">
            <label class="label">Hidden Image</label>
            <ImageUploader v-model="level.hiddenImage" uploadFolder="zonereveal" :cropWidth="400" :cropHeight="480" />
          </div>
          <div class="field">
            <label class="label">Level Header</label>
            <input class="input" v-model="level.levelHeader" placeholder="Level Header" />
          </div>

          <!-- Enemy Config -->
          <div class="field">
            <label class="label">Enemies</label>
            <div v-for="(enemy, enemyIndex) in level.enemyConfig" :key="enemyIndex" class="columns mb-1">
              <div class="column">
                <div class="select is-fullwidth">
                  <select v-model="enemy.type">
                    <option value="">Select Type</option>
                    <option v-for="t in enemyTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>
              <div class="column">
                <input class="input" type="number" v-model.number="enemy.count" placeholder="Count" />
              </div>
              <div class="column is-narrow">
                <button class="button is-danger is-small" @click="removeEnemy(levelIndex, enemyIndex)">Remove</button>
              </div>
            </div>
            <CustomButton type="is-success is-small" label="Add Enemy" @click="addEnemy(levelIndex)" />
          </div>

          <!-- Powerup Config -->
          <div class="field">
            <label class="label">Powerups</label>
            <div v-for="(powerup, powerupIndex) in level.powerupConfig" :key="powerupIndex" class="columns mb-1">
              <div class="column">
                <div class="select is-fullwidth">
                  <select v-model="powerup.type">
                    <option value="">Select Type</option>
                    <option v-for="t in powerupTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>
              <div class="column">
                <input class="input" type="number" v-model.number="powerup.count" placeholder="Count" />
              </div>
              <div class="column is-narrow">
                <button class="button is-danger is-small" @click="removePowerup(levelIndex, powerupIndex)">Remove</button>
              </div>
            </div>
            <CustomButton type="is-success is-small" label="Add Powerup" @click="addPowerup(levelIndex)" />
          </div>

          <button class="button is-danger mt-2" @click="removeLevel(levelIndex)">Remove Level</button>
          <button class="button is-primary mt-2 ml-2" @click="duplicateLevel(levelIndex)">Duplicate Level</button>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Level" @click="addLevel" />
    </div>

    <div class="field">
      <label class="label">Background Image</label>
      <ImageUploader v-model="config.backgroundImage" uploadFolder="zonereveal" :cropWidth="800" :cropHeight="600" />
    </div>

    <!-- Spritesheets -->
    <div class="field" v-if="config.spritesheets">
      <label class="label">Spritesheets</label>
      <div v-for="(value, key) in config.spritesheets" :key="key" class="columns mb-1">
        <div class="column">
          <input class="input" :value="key" disabled />
        </div>
        <div class="column">
          <ImageUploaderCircleSprite v-model="config.spritesheets[key]" uploadFolder="zonereveal" :cropSize="512" />
        </div>
        <div class="column is-narrow">
          <button class="button is-danger is-small" @click="removeSpritesheet(key)">Remove</button>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <div class="select is-fullwidth">
            <select v-model="newSpriteKey">
              <option value="">Select Key</option>
              <option v-for="k in spriteKeys" :key="k" :value="k">{{ k }}</option>
            </select>
          </div>
        </div>
        <div class="column">
          <ImageUploaderCircleSprite v-model="newSpriteValue" uploadFolder="zonereveal" :cropSize="512" />
        </div>
        <div class="column is-narrow">
          <CustomButton type="is-success is-small" label="Add" @click="addSpritesheet" :disabled="!newSpriteKey || !newSpriteValue" />
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Player Speed</label>
      <input class="input" type="number" v-model.number="config.playerSpeed" placeholder="Player Speed" />
    </div>

    <!-- Enemies Speed Array -->
    <div class="field" v-if="config.enemiesSpeedArray">
      <label class="label">Enemies Speeds</label>
      <div v-for="(value, key) in config.enemiesSpeedArray" :key="key" class="columns mb-1">
        <div class="column">
          <input class="input" :value="key" disabled />
        </div>
        <div class="column">
          <input class="input" type="number" v-model.number="config.enemiesSpeedArray[key]" placeholder="Speed" />
        </div>
        <div class="column is-narrow">
          <button class="button is-danger is-small" @click="removeEnemySpeed(key)">Remove</button>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <div class="select is-fullwidth">
            <select v-model="newEnemyKey">
              <option value="">Select Key</option>
              <option v-for="t in enemyTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>
        <div class="column">
          <input class="input" type="number" v-model.number="newEnemyValue" placeholder="Speed" />
        </div>
        <div class="column is-narrow">
          <CustomButton type="is-success is-small" label="Add" @click="addEnemySpeed" :disabled="!newEnemyKey || newEnemyValue === null" />
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Finish Percent</label>
      <input class="input" type="number" v-model.number="config.finishPercent" placeholder="Finish Percent" />
    </div>

    <div class="field">
      <label class="label">Heart Icon</label>
      <input class="input" v-model="config.heartIcon" placeholder="Heart Icon URL" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import ImageUploaderCircleSprite from '@top-x/shared/components/ImageUploaderCircleSprite.vue';
import type { ZoneRevealConfig, LevelConfig, EnemyConfig, PowerupConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{ modelValue: ZoneRevealConfig }>();
const emit = defineEmits(['update:modelValue']);

const defaultConfig = (): ZoneRevealConfig => ({
  levelsConfig: [],
  backgroundImage: '',
  spritesheets: {},
  playerSpeed: 0,
  enemiesSpeedArray: {},
  finishPercent: 0,
  heartIcon: '',
});

const config = ref<ZoneRevealConfig>(defaultConfig());

const enemyTypes = ['bouncing', 'robot', 'microbe', 'straightUp', 'straightLeft'];
const powerupTypes = ['extralive', 'extratime', 'extraspeed', 'extrafreeze'];
const spriteKeys = ['player', 'enemy', 'robot', 'microbe', 'straightUp', 'straightLeft', 'heart', 'clock', 'speed', 'freeze'];

const newSpriteKey = ref('');
const newSpriteValue = ref('');
const newEnemyKey = ref('');
const newEnemyValue = ref<number | null>(null);

watch(
  () => props.modelValue,
  (val) => {
    config.value = val ? JSON.parse(JSON.stringify(val)) : defaultConfig();
  },
  { deep: true, immediate: true },
);

watch(
  config,
  (val) => {
    emit('update:modelValue', JSON.parse(JSON.stringify(val)));
  },
  { deep: true },
);

function addLevel() {
  config.value.levelsConfig.push({
    timeLimit: 0,
    hiddenImage: '',
    levelHeader: '',
    enemyConfig: [],
    powerupConfig: [],
  } as LevelConfig);
}

function duplicateLevel(index: number) {
  const level = config.value.levelsConfig[index];
  config.value.levelsConfig.splice(index + 1, 0, JSON.parse(JSON.stringify(level)));
}

function removeLevel(index: number) {
  config.value.levelsConfig.splice(index, 1);
}

function addEnemy(levelIndex: number) {
  config.value.levelsConfig[levelIndex].enemyConfig.push({ type: '', count: 0 } as EnemyConfig);
}

function removeEnemy(levelIndex: number, enemyIndex: number) {
  config.value.levelsConfig[levelIndex].enemyConfig.splice(enemyIndex, 1);
}

function addPowerup(levelIndex: number) {
  config.value.levelsConfig[levelIndex].powerupConfig.push({ type: '', count: 0 } as PowerupConfig);
}

function removePowerup(levelIndex: number, powerupIndex: number) {
  config.value.levelsConfig[levelIndex].powerupConfig.splice(powerupIndex, 1);
}

function addSpritesheet() {
  if (!config.value.spritesheets || !newSpriteKey.value || !newSpriteValue.value) return;
  config.value.spritesheets[newSpriteKey.value] = newSpriteValue.value;
  newSpriteKey.value = '';
  newSpriteValue.value = '';
}

function removeSpritesheet(key: string) {
  if (!config.value.spritesheets) return;
  delete config.value.spritesheets[key];
}

function addEnemySpeed() {
  if (!config.value.enemiesSpeedArray || !newEnemyKey.value || newEnemyValue.value === null) return;
  config.value.enemiesSpeedArray[newEnemyKey.value] = newEnemyValue.value;
  newEnemyKey.value = '';
  newEnemyValue.value = null;
}

function removeEnemySpeed(key: string) {
  if (!config.value.enemiesSpeedArray) return;
  delete config.value.enemiesSpeedArray[key];
}
</script>

<style scoped>
.add-zone-reveal {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.label {
  font-weight: 600;
}
</style>

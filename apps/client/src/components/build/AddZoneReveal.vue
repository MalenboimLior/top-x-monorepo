<template>
  <div class="add-zone">
    <div class="field">
      <label class="label has-text-white">Background Image</label>
      <input v-model="localConfig.backgroundImage" class="input" placeholder="Background Image URL" />
    </div>
    <div class="field">
      <label class="label has-text-white">Player Speed</label>
      <input type="number" v-model.number="localConfig.playerSpeed" class="input" />
    </div>
    <div class="field">
      <label class="label has-text-white">Finish Percent</label>
      <input type="number" v-model.number="localConfig.finishPercent" class="input" />
    </div>
    <div class="field">
      <label class="label has-text-white">Heart Icon</label>
      <input v-model="localConfig.heartIcon" class="input" placeholder="Heart Icon URL" />
    </div>

    <h3 class="title is-5 has-text-white">Levels</h3>
    <div v-for="(level, lIdx) in localConfig.levelsConfig" :key="lIdx" class="box">
      <div class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input v-model="level.levelHeader" class="input" placeholder="Level Header" /></div>
          <div class="field"><input v-model="level.hiddenImage" class="input" placeholder="Hidden Image URL" /></div>
          <div class="field"><input type="number" v-model.number="level.timeLimit" class="input" placeholder="Time Limit" /></div>
          <div class="field"><button class="button is-danger is-small" @click="removeLevel(lIdx)">Remove Level</button></div>
        </div>
      </div>
      <h4 class="subtitle is-6 has-text-white">Enemies</h4>
      <div v-for="(enemy, eIdx) in level.enemyConfig" :key="eIdx" class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input v-model="enemy.type" class="input" placeholder="Type" /></div>
          <div class="field"><input type="number" v-model.number="enemy.count" class="input" placeholder="Count" /></div>
          <div class="field"><button class="button is-danger is-small" @click="removeEnemy(lIdx, eIdx)">Remove</button></div>
        </div>
      </div>
      <button class="button is-link is-light mb-2" @click="addEnemy(lIdx)">Add Enemy</button>
      <h4 class="subtitle is-6 has-text-white">Powerups</h4>
      <div v-for="(p, pIdx) in level.powerupConfig" :key="pIdx" class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input v-model="p.type" class="input" placeholder="Type" /></div>
          <div class="field"><input type="number" v-model.number="p.count" class="input" placeholder="Count" /></div>
          <div class="field"><button class="button is-danger is-small" @click="removePowerup(lIdx, pIdx)">Remove</button></div>
        </div>
      </div>
      <button class="button is-link is-light mb-2" @click="addPowerup(lIdx)">Add Powerup</button>
    </div>
    <button class="button is-link is-light" @click="addLevel">Add Level</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ZoneRevealConfig, LevelConfig, EnemyConfig, PowerupConfig } from '@top-x/shared/types';

const props = defineProps<{ modelValue: ZoneRevealConfig }>();
const emit = defineEmits(['update:modelValue']);

const localConfig = ref<ZoneRevealConfig>({
  levelsConfig: [],
  backgroundImage: '',
  playerSpeed: 100,
  finishPercent: 80,
  heartIcon: '',
  ...props.modelValue,
});

watch(localConfig, (val) => emit('update:modelValue', val), { deep: true });

function addLevel() {
  localConfig.value.levelsConfig.push({ enemyConfig: [], powerupConfig: [], timeLimit: 0, hiddenImage: '', levelHeader: '' } as LevelConfig);
}
function removeLevel(idx: number) {
  localConfig.value.levelsConfig.splice(idx, 1);
}
function addEnemy(levelIdx: number) {
  localConfig.value.levelsConfig[levelIdx].enemyConfig.push({ type: '', count: 0 } as EnemyConfig);
}
function removeEnemy(levelIdx: number, enemyIdx: number) {
  localConfig.value.levelsConfig[levelIdx].enemyConfig.splice(enemyIdx, 1);
}
function addPowerup(levelIdx: number) {
  localConfig.value.levelsConfig[levelIdx].powerupConfig.push({ type: '', count: 0 } as PowerupConfig);
}
function removePowerup(levelIdx: number, pIdx: number) {
  localConfig.value.levelsConfig[levelIdx].powerupConfig.splice(pIdx, 1);
}
</script>

<style scoped>
.box { margin-bottom: 1rem; }
</style>

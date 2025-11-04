// apps/admin/src/components/games/AddFisherGame.vue
<template>
  <div class="add-fisher-game">
    <h3 class="title is-4">Fisher Game Configuration</h3>

    <div class="field">
      <label class="label">Background Image</label>
      <ImageUploader v-model="config.backgroundImage" uploadFolder="fishergame" :cropWidth="800" :cropHeight="600" />
    </div>

    <div class="field">
      <label class="label">Fisherman Image</label>
      <ImageUploader v-model="config.fishermanImage" uploadFolder="fishergame" :cropWidth="200" :cropHeight="200" />
    </div>

    <div class="field">
      <label class="label">Hook Speed</label>
      <input class="input" type="number" v-model="config.hookSpeed" />
    </div>

    <div class="field">
      <label class="label">Offline Rate</label>
      <input class="input" type="number" v-model="config.offlineRate" />
    </div>

    <details class="collapsible">
      <summary class="collapsible-summary">
        <span class="summary-icon" aria-hidden="true">🎣</span>
        <span>Levels</span>
        <span class="summary-arrow" aria-hidden="true">▸</span>
      </summary>
      <div class="collapsible-content">
        <div class="levels-wrapper">
          <details v-for="(level, levelIndex) in config.levelsConfig" :key="levelIndex" class="level-collapsible">
            <summary class="level-summary">
              <span class="summary-icon" aria-hidden="true">🌊</span>
              <span>Level {{ levelIndex + 1 }}</span>
              <span class="summary-arrow" aria-hidden="true">▸</span>
            </summary>
            <div class="level-box">
              <div class="level-content">
                <div class="field">
                  <label class="label">Level Header</label>
                  <input class="input" v-model="level.levelHeader" />
                </div>
                <div class="field">
                  <label class="label">Background Image</label>
                  <ImageUploader v-model="level.backgroundImage" uploadFolder="fishergame" :cropWidth="800" :cropHeight="600" />
                </div>
                <!-- Add fields for catchConfig and upgradeConfig -->
              </div>
            </div>
          </details>
          <div class="level-add">
            <button class="button is-link" @click="addLevel">Add Level</button>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FisherGameConfig } from '@top-x/shared/types/fisherGame';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';

const props = defineProps<{
  modelValue: FisherGameConfig;
}>();

const emit = defineEmits(['update:modelValue']);


const config = ref<FisherGameConfig>({
  levelsConfig: [{
    catchConfig: [],
    upgradeConfig: [],
    backgroundImage: '',
    levelHeader: 'Level 1',
  }],
  backgroundImage: '',
  fishermanImage: '',
  hookSpeed: 120,
  offlineRate: 1,
});

const addLevel = () => {
  config.value.levelsConfig.push({
    catchConfig: [],
    upgradeConfig: [],
    backgroundImage: '',
    levelHeader: `Level ${config.value.levelsConfig.length + 1}`,
  });
};
</script>

<style scoped>
/* Styles similar to AddZoneReveal.vue */
</style>
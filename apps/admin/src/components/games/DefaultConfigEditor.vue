<template>
  <div class="default-config-editor">
    <AddPyramid
      v-if="configType === 'PyramidConfig'"
      v-model="localConfig as PyramidConfig"
      :gameId="'default-config-editor'"
    />
    <AddZoneReveal
      v-else-if="configType === 'ZoneRevealConfig'"
      v-model="localConfig as ZoneRevealConfig"
    />
    <AddTrivia
      v-else-if="configType === 'TriviaConfig'"
      v-model="localConfig as TriviaConfig"
      :gameId="'default-config-editor'"
    />
    <AddPacman
      v-else-if="configType === 'PacmanConfig'"
      v-model="localConfig as PacmanConfig"
    />
    <AddFisherGame
      v-else-if="configType === 'FisherGameConfig'"
      v-model="localConfig as FisherGameConfig"
    />
    <div v-else class="notification is-warning">
      Config type {{ configType }} is not yet supported in the editor.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import AddPyramid from '@/components/games/AddPyramid.vue';
import AddZoneReveal from '@/components/games/AddZoneReveal.vue';
import AddTrivia from '@/components/games/AddTrivia.vue';
import AddPacman from '@/components/games/AddPacman.vue';
import AddFisherGame from './AddFisherGame.vue';
import type { GameCustomConfig, ConfigType } from '@top-x/shared/types/game';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';
import type { TriviaConfig } from '@top-x/shared/types/trivia';
import type { PacmanConfig } from '@top-x/shared/types/pacman';
import type { FisherGameConfig } from '@top-x/shared/types/fisherGame';

const props = defineProps<{
  config: GameCustomConfig;
  configType: ConfigType;
}>();

const emit = defineEmits<{
  (event: 'update:config', value: GameCustomConfig): void;
}>();

const localConfig = ref<GameCustomConfig>(JSON.parse(JSON.stringify(props.config)));

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = JSON.parse(JSON.stringify(newConfig));
  },
  { deep: true }
);

watch(
  localConfig,
  (newConfig) => {
    emit('update:config', JSON.parse(JSON.stringify(newConfig)));
  },
  { deep: true }
);
</script>

<style scoped>
.default-config-editor {
  margin-top: 1rem;
}
</style>

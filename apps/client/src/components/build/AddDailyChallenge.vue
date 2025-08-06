<template>
  <div class="box mt-4">
    <h3 class="title is-4 has-text-white">{{ challenge.date ? 'Edit' : 'Add' }} Daily Challenge</h3>
    <div class="field">
      <label class="label has-text-white">Number</label>
      <input class="input" type="number" v-model.number="localChallenge.number" />
    </div>
    <div class="field">
      <label class="label has-text-white">Date</label>
      <input class="input" type="date" v-model="localChallenge.date" />
    </div>
    <div class="field">
      <label class="label has-text-white">Challenge Available UTC</label>
      <input class="input" type="datetime-local" v-model="localChallenge.challengeAvailableUTC" />
    </div>
    <div class="field">
      <label class="label has-text-white">Answer Reveal UTC</label>
      <input class="input" type="datetime-local" v-model="localChallenge.answerRevealUTC" />
    </div>
    <div class="field">
      <label class="label has-text-white">Next Challenge Announce UTC</label>
      <input class="input" type="datetime-local" v-model="localChallenge.nextChallengeAnnounceUTC" />
    </div>
    <div class="field">
      <label class="checkbox has-text-white">
        <input type="checkbox" v-model="localChallenge.showCountdown" />
        Show Countdown
      </label>
    </div>
    <div class="field">
      <label class="label has-text-white">Difficulty</label>
      <div class="select">
        <select v-model="localChallenge.difficulty">
          <option value="" disabled>Select difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Category</label>
      <input class="input" v-model="localChallenge.category" />
    </div>
    <div class="field">
      <label class="label has-text-white">Share Text</label>
      <input class="input" v-model="localChallenge.shareText" />
    </div>
    <div class="field">
      <label class="label has-text-white">Discussion URL</label>
      <input class="input" v-model="localChallenge.discussionUrl" />
    </div>

    <!-- Custom config based on type -->
    <div v-if="customType === 'PyramidConfig'">
      <AddPyramid v-model="localChallenge.custom as PyramidConfig" />
    </div>
    <div v-else-if="customType === 'ZoneRevealConfig'">
      <AddZoneReveal v-model="localChallenge.custom as ZoneRevealConfig" />
    </div>

    <div class="buttons mt-3">
      <CustomButton type="is-success" label="Save" @click="save" />
      <CustomButton type="is-light" label="Cancel" @click="emit('cancel')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { Game } from '@top-x/shared/types/game';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import AddPyramid from './AddPyramid.vue';
import AddZoneReveal from './AddZoneReveal.vue';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{ game: Game; challenge: DailyChallenge }>();
const emit = defineEmits<{ (e: 'saved'): void; (e: 'cancel'): void }>();

const customType = computed(() => {
  const custom = props.game.custom;
  if ('levelsConfig' in custom) return 'ZoneRevealConfig';
  if ('items' in custom) return 'PyramidConfig';
  return '';
});

const localChallenge = ref<DailyChallenge>({
  ...props.challenge,
  custom: props.challenge.custom || getDefaultCustom(customType.value),
});

async function save() {
  const challengeRef = doc(db, 'games', props.game.id, 'daily_challenges', localChallenge.value.date);
  await setDoc(challengeRef, {
    ...localChallenge.value,
    custom: localChallenge.value.custom,
    createdAt: localChallenge.value.createdAt || new Date().toISOString(),
  });
  emit('saved');
}

function getDefaultCustom(customType: string): PyramidConfig | ZoneRevealConfig {
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
  } else if (customType === 'ZoneRevealConfig') {
    return {
      levelsConfig: [],
      backgroundImage: '',
      spritesheets: {},
      playerSpeed: 0,
      enemiesSpeedArray: {},
      finishPercent: 0,
      heartIcon: '',
    };
  } else {
    throw new Error('Unknown custom type');
  }
}
</script>

<style scoped>
.box {
  background: #222;
}
</style>

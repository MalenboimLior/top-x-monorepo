<template>
  <form class="daily-challenge-form" @submit.prevent="save">
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

    <div class="buttons is-right mt-5">
      <button class="button" type="button" @click="emit('cancel')">Cancel</button>
      <button class="button is-primary" type="submit" :class="{ 'is-loading': isSaving }">Save challenge</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { Game } from '@top-x/shared/types/game';
import type { DailyChallenge, DailyChallengeSchedule } from '@top-x/shared/types/dailyChallenge';
import AddPyramid from '@/components/games/AddPyramid.vue';
import AddZoneReveal from '@/components/games/AddZoneReveal.vue';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{
  game: Game;
  challenge: (DailyChallenge & { id?: string }) | null;
}>();

const emit = defineEmits<{ (e: 'saved'): void; (e: 'cancel'): void }>();

const isSaving = ref(false);

const customType = computed(() => {
  const custom = props.game.custom;
  if (custom && 'levelsConfig' in custom) return 'ZoneRevealConfig';
  if (custom && 'items' in custom) return 'PyramidConfig';
  return '';
});

const originalId = computed(() => props.challenge?.id || props.challenge?.date || '');

const localChallenge = ref<DailyChallenge>(mapChallenge(props.challenge));

watch(
  () => props.challenge,
  (value) => {
    localChallenge.value = mapChallenge(value);
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

function mapChallenge(challenge: (DailyChallenge & { id?: string }) | null): DailyChallenge {
  if (!challenge) {
    return createDefaultChallenge();
  }

  const { id: _ignoredId, ...rest } = challenge;

  return {
    ...rest,
    schedule: withDefaultSchedule(challenge.schedule),
    custom: challenge.custom || getDefaultCustom(customType.value),
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

    emit('saved');
  } catch (error) {
    console.error('Failed to save daily challenge', error);
  } finally {
    isSaving.value = false;
  }
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
  }
  if (customType === 'ZoneRevealConfig') {
    return {
      levelsConfig: [],
      backgroundImage: '',
      spritesheets: {},
      playerSpeed: 0,
      enemiesSpeedArray: {},
      finishPercent: 0,
      heartIcon: '',
    };
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
</style>

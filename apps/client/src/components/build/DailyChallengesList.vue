<template>
  <div class="daily-challenges-list">
    <h3 class="title is-4 has-text-white">Daily Challenges for {{ game.name }}</h3>
    <CustomButton type="is-success" label="Add Challenge" @click="addChallenge" />
    <table class="table is-fullwidth has-text-white mt-3">
      <thead>
        <tr>
          <th>Date</th>
          <th>Number</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="challenge in challenges" :key="challenge.id">
          <td>{{ challenge.date }}</td>
          <td>{{ challenge.number }}</td>
          <td>
            <CustomButton type="is-small is-info" label="Edit" @click="editChallenge(challenge)" />
          </td>
        </tr>
      </tbody>
    </table>
    <AddDailyChallenge
      v-if="editingChallenge"
      :game="game"
      :challenge="editingChallenge"
      @saved="closeEditor"
      @cancel="closeEditor"
    />
    <div class="mt-3">
      <CustomButton type="is-light" label="Close" @click="emit('close')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import AddDailyChallenge from './AddDailyChallenge.vue';
import type { Game } from '@top-x/shared/types/game';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';

const props = defineProps<{ game: Game }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const challenges = ref<(DailyChallenge & { id: string })[]>([]);
const editingChallenge = ref<DailyChallenge | null>(null);
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  const colRef = collection(db, 'games', props.game.id, 'daily_challenges');
  unsubscribe = onSnapshot(colRef, snapshot => {
    challenges.value = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as DailyChallenge) }));
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

function addChallenge() {
  editingChallenge.value = {
    number: challenges.value.length + 1,
    date: '',
    createdAt: new Date().toISOString(),
    challengeAvailableUTC: '',
    answerRevealUTC: '',
    nextChallengeAnnounceUTC: '',
    custom: props.game.custom,
  };
}

function editChallenge(ch: DailyChallenge & { id: string }) {
  editingChallenge.value = { ...ch };
}

function closeEditor() {
  editingChallenge.value = null;
}
</script>

<style scoped>
.daily-challenges-list {
  padding: 1rem;
}
</style>

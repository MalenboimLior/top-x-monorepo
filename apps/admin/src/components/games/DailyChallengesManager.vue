<template>
  <div class="daily-challenges-manager">
    <div v-if="!isEditing" class="manager-list">
      <header class="manager-header">
        <div>
          <h2 class="title is-4">Daily challenges</h2>
          <p class="subtitle is-6">
            Schedule upcoming drops, review past puzzles, and mark which challenge is currently live.
          </p>
          <p v-if="currentChallengeId" class="tag is-info mt-2">Current default: {{ currentChallengeId }}</p>
        </div>
        <div class="buttons">
          <button class="button" type="button" @click="emit('close')">Close</button>
          <button class="button is-primary" type="button" @click="startAdd">Add challenge</button>
        </div>
      </header>

      <div v-if="!challenges.length" class="notification is-light has-text-centered">
        No daily challenges found. Create one to get started.
      </div>

      <div v-else class="table-container">
        <table class="table is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col" class="has-text-centered">#</th>
              <th scope="col">Opens</th>
              <th scope="col">Closes</th>
              <th scope="col">Reveal</th>
              <th scope="col">Difficulty</th>
              <th scope="col" class="has-text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="challenge in challenges" :key="challenge.id" :class="{ 'is-selected': challenge.id === currentChallengeId }">
              <td>
                <strong>{{ challenge.date }}</strong>
                <p class="is-size-7 has-text-grey">{{ challenge.category || 'No category' }}</p>
              </td>
              <td class="has-text-centered">{{ challenge.number }}</td>
              <td>{{ challenge.schedule?.availableAt || '—' }}</td>
              <td>{{ challenge.schedule?.closesAt || '—' }}</td>
              <td>{{ challenge.schedule?.revealAt || '—' }}</td>
              <td class="has-text-capitalized">{{ challenge.difficulty || '—' }}</td>
              <td class="has-text-right">
                <div class="buttons are-small is-right action-buttons">
                  <button class="button is-link" type="button" @click="editChallenge(challenge)">Edit</button>
                  <button class="button is-info" type="button" @click="duplicateChallenge(challenge)">
                    Duplicate
                  </button>
                  <button class="button is-warning" type="button" @click="setCurrent(challenge)">
                    Set current
                  </button>
                  <button
                    class="button is-danger"
                    type="button"
                    :class="{ 'is-loading': deletingId === challenge.id }"
                    @click="deleteChallenge(challenge)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="manager-editor">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <h2 class="title is-4">{{ editorTitle }}</h2>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <button class="button" type="button" @click="cancelEdit">Back to list</button>
          </div>
        </div>
      </div>

      <DailyChallengeForm :game="game" :challenge="editingChallenge" @saved="handleSaved" @cancel="cancelEdit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { Game } from '@top-x/shared/types/game';
import DailyChallengeForm from '@/components/games/DailyChallengeForm.vue';

const props = defineProps<{ game: Game }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const challenges = ref<(DailyChallenge & { id: string })[]>([]);
const editingChallenge = ref<(DailyChallenge & { id?: string }) | null>(null);
const deletingId = ref<string | null>(null);
const currentChallengeId = ref(props.game.dailyChallengeCurrent || '');
let unsubscribe: (() => void) | null = null;

const isEditing = computed(() => Boolean(editingChallenge.value));
const editorTitle = computed(() => {
  if (!editingChallenge.value) return '';
  if (editingChallenge.value.id) {
    return `Edit challenge ${editingChallenge.value.id}`;
  }
  return 'Add new challenge';
});

onMounted(() => {
  const colRef = collection(db, 'games', props.game.id, 'daily_challenges');
  unsubscribe = onSnapshot(colRef, (snapshot) => {
    challenges.value = snapshot.docs
      .map((docItem) => ({ id: docItem.id, ...(docItem.data() as DailyChallenge) }))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

watch(
  () => props.game.dailyChallengeCurrent,
  (value) => {
    currentChallengeId.value = value || '';
  },
);

function startAdd() {
  editingChallenge.value = {
    number: challenges.value.length + 1,
    date: '',
    createdAt: new Date().toISOString(),
    schedule: {
      availableAt: '',
      closesAt: '',
      revealAt: '',
    },
    custom: cloneCustom(props.game.custom),
    showCountdown: true,
  } as DailyChallenge;
}

function editChallenge(challenge: DailyChallenge & { id: string }) {
  editingChallenge.value = {
    ...challenge,
    schedule: {
      availableAt: challenge.schedule?.availableAt ?? '',
      closesAt: challenge.schedule?.closesAt ?? '',
      revealAt: challenge.schedule?.revealAt ?? '',
    },
    custom: cloneCustom(challenge.custom),
  };
}

function duplicateChallenge(challenge: DailyChallenge & { id: string }) {
  const duplicate = JSON.parse(JSON.stringify(challenge)) as DailyChallenge & { id?: string };
  delete duplicate.id;
  duplicate.date = '';
  duplicate.number = challenges.value.length + 1;
  duplicate.createdAt = new Date().toISOString();
  duplicate.schedule = {
    availableAt: challenge.schedule?.availableAt ?? '',
    closesAt: challenge.schedule?.closesAt ?? '',
    revealAt: challenge.schedule?.revealAt ?? '',
  };
  duplicate.custom = cloneCustom(challenge.custom);
  editingChallenge.value = duplicate;
}

async function deleteChallenge(challenge: DailyChallenge & { id: string }) {
  if (!confirm(`Delete daily challenge ${challenge.date}? This cannot be undone.`)) {
    return;
  }

  try {
    deletingId.value = challenge.id;
    await deleteDoc(doc(db, 'games', props.game.id, 'daily_challenges', challenge.id));
    if (currentChallengeId.value === challenge.id) {
      await updateDoc(doc(db, 'games', props.game.id), { dailyChallengeCurrent: null });
      currentChallengeId.value = '';
    }
  } catch (error) {
    console.error('Failed to delete daily challenge', error);
  } finally {
    deletingId.value = null;
  }
}

async function setCurrent(challenge: DailyChallenge & { id: string }) {
  try {
    await updateDoc(doc(db, 'games', props.game.id), { dailyChallengeCurrent: challenge.id });
    currentChallengeId.value = challenge.id;
  } catch (error) {
    console.error('Failed to set current challenge', error);
  }
}

function cancelEdit() {
  editingChallenge.value = null;
}

function handleSaved() {
  editingChallenge.value = null;
}

function cloneCustom<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to clone custom config', error);
    return value;
  }
}
</script>

<style scoped>
.daily-challenges-manager {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.manager-header .buttons {
  display: flex;
  gap: 0.75rem;
}

.action-buttons {
  justify-content: flex-end;
  gap: 0.5rem;
}

.manager-editor {
  padding-bottom: 2rem;
}
</style>

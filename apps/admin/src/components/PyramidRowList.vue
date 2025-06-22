<template>
  <Card>
    <h2 class="subtitle has-text-white">Pyramid Rows</h2>
    <CustomButton
      type="is-primary"
      label="Add New Row"
      @click="createNew"
    />
    <div v-if="isLoading" class="has-text-grey-light mt-3">Loading rows...</div>
    <div v-else-if="rows.length" class="mt-3">
      <div v-for="row in rows" :key="row.id" class="box">
        <h3 class="title is-5 has-text-white">{{ row.label }}</h3>
        <p class="has-text-grey-light">ID: {{ row.id }}, Points: {{ row.points }}, Color: {{ row.color || 'None' }}</p>
        <div class="buttons mt-2">
          <CustomButton type="is-warning" label="Edit" @click="$emit('edit', row)" />
          <CustomButton type="is-danger" label="Delete" @click="deleteRow(row.id)" />
        </div>
      </div>
    </div>
    <p v-else class="has-text-grey-light mt-3">No rows found for this game.</p>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { PyramidRow } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  gameId: string | null;
}>();

const emit = defineEmits<{
  (e: 'edit', row: PyramidRow): void;
  (e: 'refresh'): void;
}>();

const userStore = useUserStore();
const rows = ref<PyramidRow[]>([]);
const error = ref<string | null>(null);
const isLoading = ref(false);
let unsubscribe: (() => void) | null = null;

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('PyramidRowList isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const fetchRows = async (gameId: string) => {
  console.log('fetchRows called with gameId:', gameId);
  isLoading.value = true;
  try {
    if (unsubscribe) {
      unsubscribe();
      console.log('Previous onSnapshot unsubscribed for gameId:', gameId);
    }
    const gameDocRef = doc(db, 'games', gameId);
    unsubscribe = onSnapshot(gameDocRef, (doc) => {
      console.log('onSnapshot triggered for gameId:', gameId, { exists: doc.exists() });
      if (doc.exists()) {
        const gameData = doc.data();
        rows.value = (gameData.custom?.rows || []) as PyramidRow[];
        console.log('Rows fetched via onSnapshot:', { count: rows.value.length, rows: rows.value });
        if (!rows.value.length) {
          console.log('No rows found for gameId:', gameId);
        }
      } else {
        error.value = 'Game not found';
        console.log('Game not found in Firestore:', gameId);
        rows.value = [];
      }
      isLoading.value = false;
    }, async (err) => {
      console.error('fetchRows snapshot error:', { error: err.message, code: err.code });
      error.value = `Failed to fetch rows: ${err.message}`;
      console.log('Falling back to getDoc for gameId:', gameId);
      try {
        const gameDoc = await getDoc(gameDocRef);
        if (gameDoc.exists()) {
          const gameData = gameDoc.data();
          rows.value = (gameData.custom?.rows || []) as PyramidRow[];
          console.log('Rows fetched via getDoc:', { count: rows.value.length, rows: rows.value });
        } else {
          error.value = 'Game not found';
          console.log('Game not found in getDoc:', gameId);
          rows.value = [];
        }
      } catch (fallbackErr: any) {
        error.value = `Fallback fetch failed: ${fallbackErr.message}`;
        console.error('fetchRows getDoc error:', { error: fallbackErr.message, code: fallbackErr.code });
      }
      isLoading.value = false;
    });
  } catch (err: any) {
    error.value = `Failed to fetch rows: ${err.message}`;
    console.error('fetchRows try-catch error:', { error: err.message, code: err.code });
    isLoading.value = false;
  }
};

const deleteRow = async (rowId: number) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('deleteRow blocked: User is not admin');
    return;
  }
  if (!props.gameId) {
    error.value = 'No game selected';
    console.log('deleteRow blocked: No gameId');
    return;
  }
  console.log('deleteRow called for rowId:', rowId, 'gameId:', props.gameId);
  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const updatedRows = rows.value.filter(row => row.id !== rowId);
    await updateDoc(gameDocRef, { 'custom.rows': updatedRows });
    console.log('Row deleted successfully:', { rowId, gameId: props.gameId });
  } catch (err: any) {
    error.value = `Failed to delete row: ${err.message}`;
    console.error('deleteRow error:', { error: err.message, code: err.code });
  }
};

const createNew = () => {
  if (!props.gameId) {
    error.value = 'No game selected';
    console.log('createNew blocked: No gameId');
    return;
  }
  const newRow: PyramidRow = {
    id: rows.value.length ? Math.max(...rows.value.map(r => r.id)) + 1 : 1,
    label: '',
    points: 0,
    color: ''
  };
  console.log('createNew called, emitting edit with new row:', newRow);
  emit('edit', newRow);
};

const refresh = () => {
  console.log('refresh called for gameId:', props.gameId);
  if (props.gameId) {
    fetchRows(props.gameId);
    emit('refresh');
  }
};

onMounted(() => {
  console.log('PyramidRowList mounted with gameId:', props.gameId);
  if (props.gameId) {
    console.log('Calling fetchRows on mount with gameId:', props.gameId);
    fetchRows(props.gameId);
  }
});

watch(() => props.gameId, (newId, oldId) => {
  console.log('gameId watch triggered:', { newId, oldId });
  if (newId) {
    fetchRows(newId);
  } else {
    rows.value = [];
    isLoading.value = false;
    console.log('gameId cleared, resetting rows');
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
    console.log('onSnapshot unsubscribed on unmount');
  }
});

defineExpose({ refresh });
</script>

<style scoped>
.box {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
}
.mt-3 {
  margin-top: 1rem;
}
</style>
<template>
  <Card>
    <h2 class="subtitle has-text-white">{{ row.id ? 'Edit' : 'Create' }} Pyramid Row</h2>
    <div class="field">
      <label class="label has-text-white">Row ID</label>
      <div class="control">
        <input v-model.number="localRow.id" class="input" type="number" placeholder="e.g., 1" :disabled="!!row.id" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Label</label>
      <div class="control">
        <input v-model="localRow.label" class="input" type="text" placeholder="e.g., Top Tier" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Points</label>
      <div class="control">
        <input v-model.number="localRow.points" class="input" type="number" placeholder="e.g., 100" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Color (Optional)</label>
      <div class="control">
        <input v-model="localRow.color" class="input" type="text" placeholder="e.g., #ff0000" />
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <CustomButton type="is-primary" label="Save" @click="save" :disabled="isSaving" />
      </div>
      <div class="control">
        <CustomButton type="is-light" label="Cancel" @click="$emit('cancel')" />
      </div>
    </div>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
    <p v-if="success" class="notification is-success">{{ success }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { PyramidRow } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  row: PyramidRow;
  gameId: string | null;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
  (e: 'refresh'): void;
}>();

const userStore = useUserStore();
const localRow = ref<PyramidRow>({ ...props.row });
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('PyramidRowRecord isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const save = async () => {
  console.log('save called with localRow:', localRow.value, 'gameId:', props.gameId);
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('save blocked: User is not admin');
    return;
  }
  if (!props.gameId) {
    error.value = 'No game selected';
    console.log('save blocked: No gameId');
    return;
  }
  if (!localRow.value.id || !localRow.value.label || localRow.value.points == null) {
    error.value = 'Row ID, Label, and Points are required';
    console.log('save blocked: Missing required fields', localRow.value);
    return;
  }
  isSaving.value = true;
  error.value = null;
  success.value = null;

  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      const currentRows: PyramidRow[] = gameData.custom?.rows || [];
      const updatedRows = currentRows.some(row => row.id === localRow.value.id)
        ? currentRows.map(row => (row.id === localRow.value.id ? localRow.value : row))
        : [...currentRows, localRow.value];
      console.log('Updating Firestore with rows:', updatedRows);
      await updateDoc(gameDocRef, { 'custom.rows': updatedRows });
      success.value = `Row '${localRow.value.label}' saved successfully`;
      console.log('Row saved successfully:', { row: localRow.value, gameId: props.gameId });
      emit('save');
      emit('refresh');
    } else {
      error.value = 'Game not found';
      console.error('Game not found for save:', props.gameId);
    }
  } catch (err: any) {
    error.value = `Failed to save row: ${err.message}`;
    console.error('save error:', { error: err.message, code: err.code });
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.mt-3 {
  margin-top: 1rem;
}
</style>
<template>
  <Card>
    <h2 class="subtitle has-text-white">{{ item.id ? 'Edit' : 'Create' }} Pyramid Item</h2>
    <div class="field">
      <label class="label has-text-white">Item ID</label>
      <div class="control">
        <input v-model="localItem.id" class="input" type="text" placeholder="e.g., item_1" :disabled="!!item.id" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Label</label>
      <div class="control">
        <input v-model="localItem.label" class="input" type="text" placeholder="e.g., City Name" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Name</label>
      <div class="control">
        <input v-model="localItem.name" class="input" type="text" placeholder="e.g., city_name" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Image URL</label>
      <div class="control">
        <input v-model="localItem.src" class="input" type="text" placeholder="e.g., https://example.com/image.jpg" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Color (Optional)</label>
      <div class="control">
        <input v-model="localItem.color" class="input" type="text" placeholder="e.g., #FF0000" />
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
import type { PyramidItem } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  item: PyramidItem;
  gameId: string | null;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
  (e: 'refresh'): void;
}>();

const userStore = useUserStore();
const localItem = ref<PyramidItem>({ ...props.item });
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('PyramidItemRecord isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const save = async () => {
  console.log('save called with localItem:', localItem.value, 'gameId:', props.gameId);
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
  if (!localItem.value.id || !localItem.value.name || !localItem.value.label || !localItem.value.src) {
    error.value = 'Item ID, Name, Label, and Image URL are required';
    console.log('save blocked: Missing required fields', localItem.value);
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
      const currentItems: PyramidItem[] = gameData.custom?.items || [];
      const updatedItems = currentItems.some(item => item.id === localItem.value.id)
        ? currentItems.map(item => (item.id === localItem.value.id ? localItem.value : item))
        : [...currentItems, localItem.value];
      console.log('Updating Firestore with items:', updatedItems);
      await updateDoc(gameDocRef, { 'custom.items': updatedItems });
      success.value = `Item '${localItem.value.label}' saved successfully`;
      console.log('Item saved successfully:', { item: localItem.value, gameId: props.gameId });
      emit('save');
      emit('refresh');
    } else {
      error.value = 'Game not found';
      console.error('Game not found for save:', props.gameId);
    }
  } catch (err: any) {
    error.value = `Failed to save item: ${err.message}`;
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
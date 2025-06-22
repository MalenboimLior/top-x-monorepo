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
  gameId: string;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

const userStore = useUserStore();
const localItem = ref<PyramidItem>({ ...props.item });
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const save = async () => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  if (!localItem.value.id || !localItem.value.label || !localItem.value.src) {
    error.value = 'Item ID, Label, and Image URL are required';
    return;
  }
  isSaving.value = true;
  error.value = null;
  success.value = null;

  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const currentItems = gameDoc.data().custom?.items || [];
      const updatedItems = props.item.id
        ? currentItems.map((i: PyramidItem) => (i.id === props.item.id ? localItem.value : i))
        : [...currentItems, localItem.value];
      await updateDoc(gameDocRef, { 'custom.items': updatedItems });
      success.value = `Item '${localItem.value.label}' saved successfully`;
      emit('save');
    }
  } catch (err: any) {
    error.value = `Failed to save item: ${err.message}`;
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
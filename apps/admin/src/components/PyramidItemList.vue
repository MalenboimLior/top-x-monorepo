<template>
  <Card>
    <h2 class="subtitle has-text-white">Pyramid Items</h2>
    <CustomButton type="is-primary" label="Add New Item" @click="createNew" />
    <div v-if="items.length" class="mt-3">
      <div v-for="item in items" :key="item.id" class="box">
        <div class="media">
          <div class="media-left">
            <figure class="image is-48x48">
              <img :src="item.src" :alt="item.label" />
            </figure>
          </div>
          <div class="media-content">
            <p class="title is-6 has-text-white">{{ item.label }}</p>
            <p class="subtitle is-7 has-text-grey-light">ID: {{ item.id }}</p>
            <p v-if="item.color" class="has-text-grey-light">Color: {{ item.color }}</p>
          </div>
        </div>
        <div class="buttons mt-2">
          <CustomButton type="is-warning" label="Edit" @click="$emit('edit', item)" />
          <CustomButton type="is-danger" label="Delete" @click="deleteItem(item.id)" />
        </div>
      </div>
    </div>
    <p v-else class="has-text-grey-light">No items found.</p>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { PyramidItem } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  gameId: string;
}>();

const emit = defineEmits<{
  (e: 'edit', item: PyramidItem): void;
}>();

const userStore = useUserStore();
const items = ref<PyramidItem[]>([]);
const error = ref<string | null>(null);

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const fetchItems = async () => {
  const gameDoc = await getDoc(doc(db, 'games', props.gameId));
  if (gameDoc.exists()) {
    items.value = gameDoc.data().custom?.items || [];
  }
};

// Refetch items whenever the game changes. This ensures the list updates
// when a different game is selected without remounting the component.
watch(
  () => props.gameId,
  () => {
    fetchItems();
  },
  { immediate: true }
);

onMounted(() => {
  // Ensure items are loaded when the component first appears
  fetchItems();
});

const deleteItem = async (itemId: string) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const updatedItems = items.value.filter((item) => item.id !== itemId);
      await updateDoc(gameDocRef, { 'custom.items': updatedItems });
    }
  } catch (err: any) {
    error.value = `Failed to delete item: ${err.message}`;
  }
};

const createNew = () => {
  emit('edit', { id: '', src: '', label: '' });
};
</script>

<style scoped>
.box {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
}
.image.is-48x48 {
  width: 48px;
  height: 48px;
}
.mt-3 {
  margin-top: 1rem;
}
</style>

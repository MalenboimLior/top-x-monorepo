<template>
  <Card>
    <h2 class="subtitle has-text-white">Pyramid Items</h2>
    <CustomButton type="is-primary" label="Add New Item" @click="createNew" />
    <div v-if="isLoading" class="has-text-grey-light mt-3">Loading items...</div>
    <div v-else-if="items.length" class="mt-3">
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
    <p v-else class="has-text-grey-light mt-3">No items found for this game.</p>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { PyramidItem } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  gameId: string | null;
}>();

const emit = defineEmits<{
  (e: 'edit', item: PyramidItem): void;
  (e: 'refresh'): void;
}>();

const userStore = useUserStore();
const items = ref<PyramidItem[]>([]);
const error = ref<string | null>(null);
const isLoading = ref(false);
let unsubscribe: (() => void) | null = null;

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('PyramidItemList isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const fetchItems = async (gameId: string) => {
  console.log('fetchItems called with gameId:', gameId);
  isLoading.value = true;
  error.value = null;

  try {
    const gameDocRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      items.value = (gameData.custom?.items || []) as PyramidItem[];
      console.log('Items fetched via getDoc:', { count: items.value.length, items: items.value });
      if (!items.value.length) {
        console.log('No items found for gameId:', gameId);
      }
    } else {
      error.value = 'Game not found';
      console.log('Game not found in getDoc:', gameId);
      items.value = [];
    }

    // Set up onSnapshot for real-time updates
    if (unsubscribe) {
      unsubscribe();
      console.log('Previous onSnapshot unsubscribed for gameId:', gameId);
    }
    unsubscribe = onSnapshot(gameDocRef, (doc) => {
      console.log('onSnapshot triggered for gameId:', gameId, { exists: doc.exists() });
      if (doc.exists()) {
        const gameData = doc.data();
        items.value = (gameData.custom?.items || []) as PyramidItem[];
        console.log('Items fetched via onSnapshot:', { count: items.value.length, items: items.value });
        if (!items.value.length) {
          console.log('No items found in onSnapshot for gameId:', gameId);
        }
      } else {
        error.value = 'Game not found';
        console.log('Game not found in onSnapshot:', gameId);
        items.value = [];
      }
    }, (err) => {
      console.error('fetchItems snapshot error:', { error: err.message, code: err.code });
      error.value = `Failed to fetch items via onSnapshot: ${err.message}`;
    });
  } catch (err: any) {
    error.value = `Failed to fetch items: ${err.message}`;
    console.error('fetchItems try-catch error:', { error: err.message, code: err.code });
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

const deleteItem = async (itemId: string) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('deleteItem blocked: User is not admin');
    return;
  }
  if (!props.gameId) {
    error.value = 'No game selected';
    console.log('deleteItem blocked: No gameId');
    return;
  }
  console.log('deleteItem called for itemId:', itemId, 'gameId:', props.gameId);
  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const updatedItems = items.value.filter(item => item.id !== itemId);
    await updateDoc(gameDocRef, { 'custom.items': updatedItems });
    console.log('Item deleted successfully:', { itemId, gameId: props.gameId });
  } catch (err: any) {
    error.value = `Failed to delete item: ${err.message}`;
    console.error('deleteItem error:', { error: err.message, code: err.code });
  }
};

const createNew = () => {
  if (!props.gameId) {
    error.value = 'No game selected';
    console.log('createNew blocked: No gameId');
    return;
  }
  console.log('createNew called, emitting edit with new item');
  emit('edit', { id: '', src: '', label: '' });
};

const refresh = () => {
  console.log('refresh called for gameId:', props.gameId);
  if (props.gameId) {
    fetchItems(props.gameId);
    emit('refresh');
  }
};

onMounted(() => {
  console.log('PyramidItemList mounted with gameId:', props.gameId);
  if (props.gameId) {
    console.log('Calling fetchItems on mount with gameId:', props.gameId);
    fetchItems(props.gameId);
  }
});

watch(() => props.gameId, (newId, oldId) => {
  console.log('gameId watch triggered:', { newId, oldId });
  if (newId) {
    fetchItems(newId);
  } else {
    items.value = [];
    isLoading.value = false;
    console.log('gameId cleared, resetting items');
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
.image.is-48x48 {
  width: 48px;
  height: 48px;
}
.mt-3 {
  margin-top: 1rem;
}
</style>
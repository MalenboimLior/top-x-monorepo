<template>
  <Card>
    <h2 class="subtitle has-text-white">Community Items</h2>
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
            <p class="subtitle is-7 has-text-grey-light">Name: {{ item.name }}</p>
            <p class="subtitle is-7 has-text-grey-light">ID: {{ item.id }}</p>
            <p v-if="item.color" class="has-text-grey-light">Color: {{ item.color }}</p>
            <p class="subtitle is-7 has-text-grey-light">Active: {{ item.active ? 'Yes' : 'No' }}</p>
            <p class="subtitle is-7 has-text-grey-light">Source: {{ item.source }}</p>
          </div>
        </div>
        <div class="buttons mt-2">
          <CustomButton type="is-danger" label="Delete" @click="deleteItem(item.id)" />
        </div>
      </div>
    </div>
    <p v-else class="has-text-grey-light mt-3">No community items found for this game.</p>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
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
  (e: 'refresh'): void;
}>();

const userStore = useUserStore();
const items = ref<PyramidItem[]>([]);
const error = ref<string | null>(null);
const isLoading = ref(false);
let unsubscribe: (() => void) | null = null;

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const fetchItems = async (gameId: string) => {
  if (!gameId) {
    error.value = 'No game selected';
    isLoading.value = false;
    items.value = [];
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const gameDocRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      items.value = (gameData.custom?.communityItems || []) as PyramidItem[];
    } else {
      error.value = 'Game not found';
      items.value = [];
    }

    if (unsubscribe) unsubscribe();
    unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        items.value = (data.custom?.communityItems || []) as PyramidItem[];
      } else {
        items.value = [];
      }
    }, (err) => {
      console.error('CommunityItemList snapshot error:', err.message);
    });
  } catch (err: any) {
    error.value = `Failed to fetch community items: ${err.message}`;
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

const deleteItem = async (itemId: string) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  if (!props.gameId) {
    error.value = 'No game selected';
    return;
  }
  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const updatedItems = items.value.filter(item => item.id !== itemId);
    await updateDoc(gameDocRef, { 'custom.communityItems': updatedItems });
  } catch (err: any) {
    error.value = `Failed to delete item: ${err.message}`;
  }
};

const refresh = () => {
  if (props.gameId) {
    fetchItems(props.gameId);
    emit('refresh');
  }
};

onMounted(() => {
  if (props.gameId) {
    fetchItems(props.gameId);
  }
});

watch(() => props.gameId, (newId, oldId) => {
  if (newId) {
    fetchItems(newId);
  } else {
    items.value = [];
    isLoading.value = false;
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
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


<template>
  <Card>
    <h2 class="subtitle has-text-white">Game Types</h2>
    <CustomButton type="is-primary" label="Create New Game Type" @click="createNew" />
    <div v-if="gameTypes.length" class="mt-3">
      <div v-for="gameType in gameTypes" :key="gameType.id" class="box">
        <h3 class="title is-5 has-text-white">{{ gameType.name }}</h3>
        <p class="has-text-grey-light">{{ gameType.description }}</p>
        <p class="has-text-grey-light">Config: {{ gameType.custom }}</p>
        <div class="buttons mt-2">
          <CustomButton type="is-info" label="Select" @click="$emit('select', gameType.id)" />
          <CustomButton type="is-warning" label="Edit" @click="$emit('edit', gameType)" />
          <CustomButton type="is-danger" label="Delete" @click="deleteGameType(gameType.id)" />
        </div>
      </div>
    </div>
    <p v-else class="has-text-grey-light">No game types found.</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'; // Add computed import
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { GameType } from '@top-x/shared/types/game';

const userStore = useUserStore();
const gameTypes = ref<GameType[]>([]);
const error = ref<string | null>(null);

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const fetchGameTypes = () => {
  const q = query(collection(db, 'gameTypes'));
  onSnapshot(q, (snapshot) => {
    gameTypes.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      availableToBuild: false,
      ...doc.data(),
    } as GameType));
  }, (err) => {
    error.value = `Failed to fetch game types: ${err.message}`;
  });
};

const deleteGameType = async (id: string) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  try {
    await deleteDoc(doc(db, 'gameTypes', id));
  } catch (err: any) {
    error.value = `Failed to delete game type: ${err.message}`;
  }
};

const createNew = () => {
  emit('edit', { id: '', name: '', description: '', custom: 'PyramidConfig', availableToBuild: false });
};

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'edit', gameType: GameType): void;
}>();

onMounted(fetchGameTypes);
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
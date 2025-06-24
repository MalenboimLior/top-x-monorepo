<template>
  <Card>
    <h2 class="subtitle has-text-white">Games</h2>
    <CustomButton
      type="is-primary"
      label="Create New Game"
      @click="createNew"
      :disabled="!selectedGameTypeId"
    />
    <div v-if="isLoading" class="has-text-grey-light mt-3">Loading games...</div>
    <div v-else-if="games.length" class="mt-3">
      <div v-for="game in games" :key="game.id" class="box">
        <h3 class="title is-5 has-text-white">{{ game.name }}</h3>
        <p class="has-text-grey-light">{{ game.description }}</p>
        <p class="has-text-grey-light">Active: {{ game.active ? 'Yes' : 'No' }}</p>
        <div class="buttons mt-2">
          <CustomButton type="is-info" label="Select" @click="$emit('select', game.id)" />
          <CustomButton type="is-warning" label="Edit" @click="$emit('edit', game)" />
          <CustomButton type="is-danger" label="Delete" @click="deleteGame(game.id)" />
        </div>
      </div>
    </div>
    <p v-else class="has-text-grey-light mt-3">No games found for this game type.</p>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { Game } from '@top-x/shared/types/game';

const props = defineProps<{
  selectedGameTypeId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'edit', game: Game): void;
  (e: 'mounted'): void;
}>();

const userStore = useUserStore();
const games = ref<Game[]>([]);
const error = ref<string | null>(null);
const isLoading = ref(false);

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const fetchGames = async (gameTypeId: string) => {
  console.log('fetchGames called with gameTypeId:', gameTypeId);
  isLoading.value = true;
  try {
    const q = query(collection(db, 'games'), where('gameTypeId', '==', gameTypeId));
    console.log('Firestore query created:', { collection: 'games', gameTypeId });
    onSnapshot(q, (snapshot) => {
      games.value = snapshot.docs.map((doc) => {
        const gameData = { id: doc.id, ...doc.data() } as Game;
        console.log('Game document fetched:', gameData);
        return gameData;
      });
      console.log('Games fetched:', { count: games.value.length, games: games.value });
      isLoading.value = false;
      if (!games.value.length) {
        console.log('No games found for gameTypeId:', gameTypeId);
      }
    }, (err) => {
      error.value = `Failed to fetch games: ${err.message}`;
      console.error('fetchGames snapshot error:', { error: err.message, code: err.code });
      isLoading.value = false;
    });
  } catch (err: any) {
    error.value = `Failed to fetch games: ${err.message}`;
    console.error('fetchGames try-catch error:', { error: err.message, code: err.code });
    isLoading.value = false;
  }
};

const deleteGame = async (id: string) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('deleteGame blocked: User is not admin');
    return;
  }
  console.log('deleteGame called for id:', id);
  try {
    await deleteDoc(doc(db, 'games', id));
    console.log('Game deleted successfully:', id);
  } catch (err: any) {
    error.value = `Failed to delete game: ${err.message}`;
    console.error('deleteGame error:', { error: err.message, code: err.code });
  }
};

const createNew = () => {
  if (props.selectedGameTypeId) {
    const newGame: Game = {
      id: '',
      name: '',
      description: '',
      gameTypeId: props.selectedGameTypeId,
      custom: { items: [], rows: [], sortItems: { orderBy: 'id', order: 'asc' } }, // Default for PyramidConfig
      gameHeader: '',
      poolHeader: '',
      worstHeader: '',
      shareText: '',
      active: false,
    };
    console.log('createNew called, emitting edit with new game:', newGame);
    emit('edit', newGame);
  } else {
    console.log('createNew blocked: No selectedGameTypeId');
  }
};

onMounted(() => {
  console.log('GameList mounted with initial selectedGameTypeId:', props.selectedGameTypeId);
  emit('mounted');
  if (props.selectedGameTypeId) {
    console.log('Calling fetchGames on mount with gameTypeId:', props.selectedGameTypeId);
    fetchGames(props.selectedGameTypeId);
  }
});

watch(() => props.selectedGameTypeId, (newId, oldId) => {
  console.log('selectedGameTypeId watch triggered:', { newId, oldId });
  if (newId) {
    fetchGames(newId);
  } else {
    games.value = [];
    isLoading.value = false;
    console.log('selectedGameTypeId cleared, resetting games');
  }
});
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
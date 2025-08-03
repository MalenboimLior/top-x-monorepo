<!-- Page for building new games -->
<template>
  <div class="build-container">
    <h1 class="title has-text-white">Build Your Own Game</h1>
    <p class="subtitle has-text-grey-light">Choose a game type to create your custom game!</p>

    <div v-if="!user">
      <div class="notification is-warning">
        Only logged-in users can create new games. Please login to continue.
      </div>
      <CustomButton type="is-primary" label="Login" @click="login" />
    </div>

    <div v-else>
      <div class="columns is-multiline is-mobile">
        <div v-for="gameType in availableGameTypes" :key="gameType.id" class="column is-half-desktop is-half-tablet is-full-mobile">
          <Card class="is-clickable" @click="selectGameType(gameType)">
            <div class="card-content">
              <h2 class="title is-4 has-text-white">{{ gameType.name }}</h2>
              <p class="has-text-grey-light">{{ gameType.description }}</p>
            </div>
          </Card>
        </div>
      </div>

      <div v-if="selectedGameType">
        <h2 class="title is-3 has-text-white mt-5">Create {{ selectedGameType.name }} Game</h2>
        <BuildAddNewGame :gameType="selectedGameType" @save="handleSave" @cancel="selectedGameType = null" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import BuildAddNewGame from '@/components/BuildAddNewGame.vue';
import type { GameType } from '@top-x/shared/types/game';

const userStore = useUserStore();
const user = ref(userStore.user);
const availableGameTypes = ref<GameType[]>([]);
const selectedGameType = ref<GameType | null>(null);

onMounted(() => {
  if (user.value) {
    fetchAvailableGameTypes();
  }
});

function fetchAvailableGameTypes() {
  const q = query(collection(db, 'gameTypes'), where('availableToBuild', '==', true));
  onSnapshot(q, (snapshot) => {
    availableGameTypes.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameType));
  }, (err) => {
    console.error('Error fetching game types:', err);
  });
}

function selectGameType(gameType: GameType) {
  selectedGameType.value = gameType;
}

function handleSave(newGame: any) {
  // Handle save logic if needed, but it's in the component
  selectedGameType.value = null;
}

async function login() {
  try {
    await userStore.loginWithX();
    user.value = userStore.user;
    if (user.value) {
      fetchAvailableGameTypes();
    }
  } catch (err) {
    console.error('Login error:', err);
  }
}
</script>

<style scoped>
.build-container {
  padding: 2rem;
}
.is-clickable {
  cursor: pointer;
}
</style>
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
      <h2 class="title is-3 has-text-white">Available Game Types</h2>
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

      <h2 class="title is-3 has-text-white mt-5">My Games</h2>
      <div class="columns is-multiline is-mobile">
        <div v-for="game in myGames" :key="game.id" class="column is-half-desktop is-half-tablet is-full-mobile">
          <Card>
            <div class="card-content">
              <h2 class="title is-4 has-text-white">{{ game.name }}</h2>
              <p class="has-text-grey-light">{{ game.description }}</p>
              <p class="has-text-grey-light">Status: {{ game.active ? 'Published' : 'Draft' }}</p>
              <div class="buttons">
                <CustomButton type="is-primary" label="Edit" @click="editGame(game)" />
                <CustomButton
                  :type="game.active ? 'is-warning' : 'is-success'"
                  :label="game.active ? 'Unpublish' : 'Publish'"
                  @click="togglePublish(game)"
                />
                <CustomButton
                  type="is-info"
                  label="Edit Daily Challenges"
                  @click="openDailyChallenges(game)"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div v-if="selectedGameType">
        <h2 class="title is-3 has-text-white mt-5">{{ selectedGame ? 'Edit' : 'Create' }} {{ selectedGameType.name }} Game</h2>
        <BuildAddNewGame
          :gameType="selectedGameType"
          :existingGame="selectedGame"
          @save="handleSave"
          @cancel="handleCancel"
        />
      </div>
      <DailyChallengesList
        v-if="selectedDailyChallengesGame"
        :game="selectedDailyChallengesGame"
        @close="selectedDailyChallengesGame = null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import BuildAddNewGame from '@/components/BuildAddNewGame.vue';
import DailyChallengesList from '@/components/build/DailyChallengesList.vue';
import type { GameType, Game } from '@top-x/shared/types/game';

const userStore = useUserStore();
const user = ref(userStore.user);
const availableGameTypes = ref<GameType[]>([]);
const myGames = ref<Game[]>([]);
const selectedGameType = ref<GameType | null>(null);
const selectedGame = ref<Game | null>(null);
const selectedDailyChallengesGame = ref<Game | null>(null);

onMounted(() => {
  if (user.value) {
    fetchAvailableGameTypes();
    fetchMyGames();
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

function fetchMyGames() {
  if (!user.value?.uid) return;
  const q = query(collection(db, 'games'), where('creator.userid', '==', user.value.uid));
  onSnapshot(q, (snapshot) => {
    myGames.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
  }, (err) => {
    console.error('Error fetching my games:', err);
  });
}

function selectGameType(gameType: GameType) {
  selectedGameType.value = gameType;
  selectedGame.value = null;
}

function editGame(game: Game) {
  const gameType = availableGameTypes.value.find(t => t.id === game.gameTypeId);
  if (gameType) {
    selectedGameType.value = gameType;
    selectedGame.value = game;
  } else {
    console.error('Game type not found for editing');
  }
}

function openDailyChallenges(game: Game) {
  selectedDailyChallengesGame.value = game;
}

async function togglePublish(game: Game) {
  try {
    const gameRef = doc(db, 'games', game.id);
    await updateDoc(gameRef, { active: !game.active });
    // myGames will update via snapshot
  } catch (err) {
    console.error('Error toggling publish:', err);
  }
}

function handleSave() {
  selectedGameType.value = null;
  selectedGame.value = null;
}

function handleCancel() {
  selectedGameType.value = null;
  selectedGame.value = null;
}

async function login() {
  try {
    await userStore.loginWithX();
    user.value = userStore.user;
    if (user.value) {
      fetchAvailableGameTypes();
      fetchMyGames();
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
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
      <div v-if="!selectedGameType && !selectedDailyChallengesGame">
        <h2 class="title is-3 has-text-white">Available Game Types</h2>
        <div class="buttons">
          <button
            v-for="gameType in availableGameTypes"
            :key="gameType.id"
            class="button is-small is-dark"
            @click="selectGameType(gameType)"
          >
            {{ gameType.name }} <span > + </span>
          </button>
          
        </div>

        <h2 class="title is-3 has-text-white mt-5">My Games</h2>
        <table class="table is-fullwidth has-text-white">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in myGames" :key="game.id">
              <td>{{ game.name }}</td>
              <td>{{ game.description }}</td>
              <td>{{ game.active ? 'Published' : 'Draft' }}</td>
              <td>
                <div class="buttons">
                  <CustomButton type="is-primary is-small" label="Edit" @click="editGame(game)" />
                  <CustomButton
                    :type="game.active ? 'is-warning is-small' : 'is-success is-small'"
                    :label="game.active ? 'Unpublish' : 'Publish'"
                    @click="togglePublish(game)"
                  />
                  <CustomButton
                    type="is-info is-small"
                    label="Edit Daily Challenges"
                    @click="openDailyChallenges(game)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedGameType">
        <button class="button is-light mb-3" @click="handleCancel">Back to List</button>
        <h2 class="title is-3 has-text-white">{{ selectedGame ? 'Edit' : 'Create' }} {{ selectedGameType.name }} Game</h2>
        <BuildAddNewGame
          :gameType="selectedGameType"
          :existingGame="selectedGame"
          @save="handleSave"
          @cancel="handleCancel"
        />
      </div>

      <div v-if="selectedDailyChallengesGame">
        <button class="button is-light mb-3" @click="selectedDailyChallengesGame = null">Back to List</button>
        <DailyChallengesList
          :game="selectedDailyChallengesGame"
          @close="selectedDailyChallengesGame = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import BuildAddNewGame from '@/components/build/BuildAddNewGame.vue';
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
</style>
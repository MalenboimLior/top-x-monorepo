<template>
  <div class="container">
    <h1 class="title has-text-white">Game Management</h1>

    <!-- Game Type Form -->
    <Card>
      <h2 class="subtitle has-text-white">Create Game Type</h2>
      <div class="field">
        <label class="label has-text-white">Game Type ID</label>
        <div class="control">
          <input v-model="newGameType.id" class="input" type="text" placeholder="e.g., trivia" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Name</label>
        <div class="control">
          <input v-model="newGameType.name" class="input" type="text" placeholder="e.g., Trivia" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Description</label>
        <div class="control">
          <textarea v-model="newGameType.description" class="textarea" placeholder="Describe the game type"></textarea>
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Custom Data (JSON)</label>
        <div class="control">
          <textarea v-model="newGameTypeCustom" class="textarea" placeholder='e.g., {"leaderboardType": "score"}'></textarea>
        </div>
        <p v-if="customError" class="help is-danger">{{ customError }}</p>
      </div>
      <div class="field">
        <div class="control">
          <CustomButton type="is-primary" label="Create Game Type" @click="createGameType" :disabled="isCreating" />
        </div>
      </div>
      <p v-if="error" class="notification is-danger">{{ error }}</p>
      <p v-if="success" class="notification is-success">{{ success }}</p>
    </Card>

    <!-- Game Type List -->
    <Card class="mt-3">
      <h2 class="subtitle has-text-white">Game Types</h2>
      <div v-if="gameTypes.length">
        <div v-for="gameType in gameTypes" :key="gameType.id" class="box">
          <h3 class="title is-5 has-text-white">{{ gameType.name }}</h3>
          <p class="has-text-grey-light">{{ gameType.description }}</p>
          <p v-if="gameType.custom" class="has-text-grey-light">Custom: {{ JSON.stringify(gameType.custom) }}</p>
          <CustomButton
            type="is-info"
            label="View Games"
            @click="selectGameType(gameType.id)"
            class="mt-2"
          />
        </div>
      </div>
      <p v-else class="has-text-grey-light">No game types found.</p>
    </Card>

    <!-- Game Form -->
    <Card v-if="selectedGameTypeId" class="mt-3">
      <h2 class="subtitle has-text-white">Create Game for {{ selectedGameTypeId }}</h2>
      <div class="field">
        <label class="label has-text-white">Game ID</label>
        <div class="control">
          <input v-model="newGame.id" class="input" type="text" placeholder="e.g., smartest_on_x" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Name</label>
        <div class="control">
          <input v-model="newGame.name" class="input" type="text" placeholder="e.g., Smartest on X" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Description</label>
        <div class="control">
          <textarea v-model="newGame.description" class="textarea" placeholder="Describe the game"></textarea>
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Custom Data (JSON)</label>
        <div class="control">
          <textarea v-model="newGameCustom" class="textarea" placeholder='e.g., {"maxQuestions": 10}'></textarea>
        </div>
        <p v-if="gameCustomError" class="help is-danger">{{ gameCustomError }}</p>
      </div>
      <div class="field">
        <div class="control">
          <CustomButton type="is-primary" label="Create Game" @click="createGame" :disabled="isCreating" />
        </div>
      </div>
    </Card>

    <!-- Game List -->
    <Card v-if="selectedGameTypeId" class="mt-3">
      <h2 class="subtitle has-text-white">Games for {{ selectedGameTypeId }}</h2>
      <div v-if="games.length">
        <div v-for="game in games" :key="game.id" class="box">
          <h3 class="title is-5 has-text-white">{{ game.name }}</h3>
          <p class="has-text-grey-light">{{ game.description }}</p>
          <p v-if="game.custom" class="has-text-grey-light">Custom: {{ JSON.stringify(game.custom) }}</p>
        </div>
      </div>
      <p v-else class="has-text-grey-light">No games found for this game type.</p>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { collection, doc, setDoc, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { GameType, Game } from '@top-x/shared/types/game';

const userStore = useUserStore();
const gameTypes = ref<GameType[]>([]);
const games = ref<Game[]>([]);
const newGameType = ref<GameType>({ id: '', name: '', description: '' });
const newGameTypeCustom = ref<string>('');
const newGame = ref<Game>({ id: '', name: '', description: '', gameTypeId: '' });
const newGameCustom = ref<string>('');
const selectedGameTypeId = ref<string | null>(null);
const isCreating = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const customError = ref<string | null>(null);
const gameCustomError = ref<string | null>(null);

const isAdmin = computed(() => userStore.profile?.isAdmin || false);

const fetchGameTypes = async () => {
  try {
    const q = query(collection(db, 'gameTypes'));
    onSnapshot(q, (snapshot) => {
      gameTypes.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as GameType));
      console.log('Game types fetched:', gameTypes.value);
    });
  } catch (err: any) {
    error.value = `Failed to fetch game types: ${err.message}`;
    console.error(err);
  }
};

const fetchGames = async (gameTypeId: string) => {
  try {
    const q = query(collection(db, 'games'));
    onSnapshot(q, (snapshot) => {
      games.value = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Game))
        .filter((game) => game.gameTypeId === gameTypeId);
      console.log(`Games fetched for ${gameTypeId}:`, games.value);
    });
  } catch (err: any) {
    error.value = `Failed to fetch games: ${err.message}`;
    console.error(err);
  }
};

const createGameType = async () => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  if (!newGameType.value.id || !newGameType.value.name) {
    error.value = 'Game Type ID and Name are required';
    return;
  }
  isCreating.value = true;
  error.value = null;
  success.value = null;
  customError.value = null;

  let customData: Record<string, any> | undefined;
  if (newGameTypeCustom.value) {
    try {
      customData = JSON.parse(newGameTypeCustom.value);
    } catch (err) {
      customError.value = 'Invalid JSON in Custom Data';
      isCreating.value = false;
      return;
    }
  }

  try {
    const gameTypeRef = doc(db, 'gameTypes', newGameType.value.id);
    await setDoc(gameTypeRef, {
      name: newGameType.value.name,
      description: newGameType.value.description,
      custom: customData || null,
    });
    success.value = `Game Type '${newGameType.value.name}' created successfully`;
    newGameType.value = { id: '', name: '', description: '' };
    newGameTypeCustom.value = '';
  } catch (err: any) {
    error.value = `Failed to create game type: ${err.message}`;
    console.error(err);
  } finally {
    isCreating.value = false;
  }
};

const createGame = async () => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  if (!selectedGameTypeId.value || !newGame.value.id || !newGame.value.name) {
    error.value = 'Game Type, Game ID, and Name are required';
    return;
  }
  isCreating.value = true;
  error.value = null;
  success.value = null;
  gameCustomError.value = null;

  let customData: Record<string, any> | undefined;
  if (newGameCustom.value) {
    try {
      customData = JSON.parse(newGameCustom.value);
    } catch (err) {
      gameCustomError.value = 'Invalid JSON in Custom Data';
      isCreating.value = false;
      return;
    }
  }

  try {
    const gameRef = doc(db, 'games', newGame.value.id);
    await setDoc(gameRef, {
      name: newGame.value.name,
      description: newGame.value.description,
      gameTypeId: selectedGameTypeId.value,
      custom: customData || null,
    });
    success.value = `Game '${newGame.value.name}' created successfully`;
    newGame.value = { id: '', name: '', description: '', gameTypeId: '' };
    newGameCustom.value = '';
  } catch (err: any) {
    error.value = `Failed to create game: ${err.message}`;
    console.error(err);
  } finally {
    isCreating.value = false;
  }
};

const selectGameType = (gameTypeId: string) => {
  selectedGameTypeId.value = gameTypeId;
  newGame.value.gameTypeId = gameTypeId;
  fetchGames(gameTypeId);
};

fetchGameTypes();
</script>

<style scoped>
.container {
  padding: 1rem;
}

.mt-3 {
  margin-top: 1rem;
}

.box {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
}
</style>
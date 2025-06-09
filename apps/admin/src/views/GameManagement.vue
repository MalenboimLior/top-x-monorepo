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
      <h2 class="title has-text-white">Create Game for {{ selectedGameTypeId }}</h2>
      <div class="field">
        <label class="label has-text-white">Game ID</label>
        <div class="control">
          <input v-model="newGame.id" class="input" type="text" placeholder="Game ID"/>
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
          <CustomButton
            v-if="game.id === 'Pyramid_Cities'"
            type="is-info"
            label="Manage Items"
            @click="selectGameForItems(game.id)"
            class="mt-2"
          />
        </div>
      </div>
      <p v-else class="has-text-grey-light">No games found for this game type.</p>
    </Card>

    <!-- Item Management for Pyramid Cities -->
    <Card v-if="selectedGameId === 'Pyramid_Cities'" class="mt-3">
      <h2 class="subtitle has-text-white">Manage Items for Pyramid Cities</h2>
      <AdminAddItems />
      <div v-if="items.length" class="mt-3">
        <h3 class="subtitle has-text-white">Current Items</h3>
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
            </div>
          </div>
          <CustomButton
            type="is-danger"
            label="Remove"
            @click="removeItem(item.id)"
            class="mt-2"
          />
        </div>
      </div>
      <p v-else class="has-text-grey-light">No items found for this game.</p>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { collection, doc, setDoc, query, onSnapshot, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import AdminAddItems from '@/components/AdminAddItems.vue';
import type { GameType, Game } from '@top-x/shared/types/game';
import type { ImageItem } from '@top-x/shared/types/pyramid';

const userStore = useUserStore();
const gameTypes = ref<GameType[]>([]);
const games = ref<Game[]>([]);
const items = ref<ImageItem[]>([]);
const newGameType = ref<GameType>({ id: '', name: '', description: '' });
const newGameTypeCustom = ref<string>('');
const newGame = ref<Game>({ id: '', name: '', description: '', gameTypeId: '' });
const newGameCustom = ref<string>('');
const selectedGameTypeId = ref<string | null>(null);
const selectedGameId = ref<string | null>(null);
const isCreating = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const customError = ref<string | null>(null);
const gameCustomError = ref<string | null>(null);

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const fetchGameTypes = async () => {
  try {
    console.log('Fetching game types...');
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
    console.error('fetchGameTypes error:', err);
  }
};

const fetchGames = async (gameTypeId: string) => {
  try {
    console.log(`Fetching games for gameTypeId: ${gameTypeId}`);
    const q = query(collection(db, 'games'));
    onSnapshot(q, (snapshot) => {
      games.value = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Game))
        .filter((game) => game.gameTypeId === gameTypeId);
      console.log(`Games fetched for ${gameTypeId}:`, games.value);
    });
  } catch (err: any) {
    error.value = `Failed to fetch games: ${err.message}`;
    console.error('fetchGames error:', err);
  }
};

const fetchGameItems = async (gameId: string) => {
  try {
    console.log(`Fetching items for game: ${gameId}`);
    const gameDocRef = doc(db, 'games', gameId);
    onSnapshot(gameDocRef, (doc) => {
      if (doc.exists()) {
        const gameData = doc.data();
        items.value = gameData.custom?.items || [];
        console.log(`Items fetched for ${gameId}:`, items.value);
      } else {
        items.value = [];
        console.log(`No items found for ${gameId}`);
      }
    });
  } catch (err: any) {
    error.value = `Failed to fetch items: ${err.message}`;
    console.error('fetchGameItems error:', err);
  }
};

const createGameType = async () => {
  console.log('createGameType called', { newGameType: newGameType.value, newGameTypeCustom: newGameTypeCustom.value });
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('createGameType failed: User is not admin');
    return;
  }
  if (!newGameType.value.id || !newGameType.value.name) {
    error.value = 'Game Type ID and Name are required';
    console.log('createGameType failed: Missing ID or Name', newGameType.value);
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
      console.log('Parsed customData for game type:', customData);
    } catch (err) {
      customError.value = 'Invalid JSON in Custom Data';
      console.log('createGameType failed: Invalid JSON', newGameTypeCustom.value);
      isCreating.value = false;
      return;
    }
  }

  try {
    const gameTypeRef = doc(db, 'gameTypes', newGameType.value.id);
    console.log('Creating game type with ref:', gameTypeRef.path);
    await setDoc(gameTypeRef, {
      name: newGameType.value.name,
      description: newGameType.value.description,
      custom: customData || null,
    });
    success.value = `Game Type '${newGameType.value.name}' created successfully`;
    console.log('Game type created:', newGameType.value);
    newGameType.value = { id: '', name: '', description: '' };
    newGameTypeCustom.value = '';
  } catch (err: any) {
    error.value = `Failed to create game type: ${err.message}`;
    console.error('createGameType error:', err);
  } finally {
    isCreating.value = false;
  }
};

const createGame = async () => {
  console.log('createGame called', {
    selectedGameTypeId: selectedGameTypeId.value,
    newGame: newGame.value,
    newGameCustom: newGameCustom.value,
  });
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('createGame failed: User is not admin');
    return;
  }
  if (!selectedGameTypeId.value || !newGame.value.id || !newGame.value.name) {
    error.value = 'Game Type, Game ID, and Name are required';
    console.log('createGame failed: Missing required fields', {
      selectedGameTypeId: selectedGameTypeId.value,
      newGame: newGame.value,
    });
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
      console.log('Parsed customData for game:', customData);
    } catch (err) {
      gameCustomError.value = 'Invalid JSON in Custom Data';
      console.log('createGame failed: Invalid JSON', newGameCustom.value);
      isCreating.value = false;
      return;
    }
  }

  try {
    const gameRef = doc(db, 'games', newGame.value.id);
    console.log('Creating game with ref:', gameRef.path);
    await setDoc(gameRef, {
      name: newGame.value.name,
      description: newGame.value.description,
      gameTypeId: selectedGameTypeId.value,
      custom: customData || { items: [] }, // Initialize with empty items array
    });
    success.value = `Game '${newGame.value.name}' created successfully`;
    console.log('Game created:', newGame.value);
    newGame.value = { id: '', name: '', description: '', gameTypeId: '' };
    newGameCustom.value = '';
  } catch (err: any) {
    error.value = `Failed to create game: ${err.message}`;
    console.error('createGame error:', err);
  } finally {
    isCreating.value = false;
  }
};

const selectGameType = (gameTypeId: string) => {
  console.log('selectGameType called:', gameTypeId);
  selectedGameTypeId.value = gameTypeId;
  newGame.value.gameTypeId = gameTypeId;
  fetchGames(gameTypeId);
  selectedGameId.value = null; // Reset selected game when changing game type
};

const selectGameForItems = (gameId: string) => {
  console.log('selectGameForItems called:', gameId);
  selectedGameId.value = gameId;
  fetchGameItems(gameId);
};

const removeItem = async (itemId: string | number) => {
  console.log('removeItem called:', itemId);
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('removeItem failed: User is not admin');
    return;
  }
  try {
    const gameDocRef = doc(db, 'games', 'Pyramid_Cities');
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const items = gameDoc.data().custom?.items || [];
      const updatedItems = items.filter((item: ImageItem) => item.id !== itemId);
      await updateDoc(gameDocRef, { 'custom.items': updatedItems });
      console.log(`Item ${itemId} removed from Pyramid_Cities`);
      success.value = `Item ${itemId} removed successfully`;
    } else {
      error.value = 'Game not found';
      console.log('removeItem failed: Game not found');
    }
  } catch (err: any) {
    error.value = `Failed to remove item: ${err.message}`;
    console.error('removeItem error:', err);
  }
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

.image.is-48x48 {
  width: 48px;
  height: 48px;
}
</style>
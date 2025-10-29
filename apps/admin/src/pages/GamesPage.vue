<template>
  <section class="section">
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="title">Games</h1>
          <p class="subtitle">Track live games, monitor engagement, and launch new experiences.</p>
        </div>
        <div class="header-actions">
          <button class="button is-primary" @click="openCreateGame" :disabled="!gameTypes.length">
            Add game
          </button>
        </div>
      </div>

      <div v-if="!sortedGames.length" class="box has-text-centered has-text-grey">
        No games found yet. Once games are published you'll see live counters here.
      </div>

      <div v-else class="table-container">
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th scope="col">Game</th>
              <th scope="col" class="has-text-right">Players</th>
              <th scope="col" class="has-text-right">Favorites</th>
              <th scope="col" class="has-text-right">Sessions</th>
              <th scope="col" class="has-text-right">Submissions</th>
              <th scope="col" class="has-text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in sortedGames" :key="game.id">
              <td>
                <div class="game-info">
                  <strong>{{ game.name }}</strong>
                  <span class="game-meta">{{ game.gameTypeId || 'Unassigned' }}</span>
                </div>
              </td>
              <td class="has-text-right">{{ formatCounter(game.counters?.totalPlayers) }}</td>
              <td class="has-text-right">{{ formatCounter(game.counters?.favorites) }}</td>
              <td class="has-text-right">{{ formatCounter(game.counters?.sessionsPlayed) }}</td>
              <td class="has-text-right">{{ formatCounter(game.counters?.uniqueSubmitters) }}</td>
              <td class="has-text-right">
                <div class="buttons are-small is-right action-buttons">
                  <button class="button is-link" type="button" @click="openEditGame(game)">
                    Edit
                  </button>
                  <button class="button is-info" type="button" @click="openDailyChallenges(game)">
                    Daily challenges
                  </button>
                  <button
                    class="button is-danger"
                    type="button"
                    :class="{ 'is-loading': isDeletingId === game.id }"
                    @click="confirmDelete(game)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <div class="modal" :class="{ 'is-active': isEditorOpen }">
    <div class="modal-background" @click="closeEditor"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ selectedGame ? 'Edit game' : 'Add new game' }}</p>
        <button class="delete" aria-label="close" @click="closeEditor"></button>
      </header>
      <section class="modal-card-body">
        <div class="field">
          <label class="label">Game type</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select v-model="selectedGameTypeId" :disabled="Boolean(selectedGame)">
                <option value="" disabled>Select a game type</option>
                <option v-for="type in gameTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <p v-if="!selectedGameTypeId" class="has-text-grey">
          Choose a game type to configure the game settings.
        </p>
        <p v-else-if="!selectedGameType" class="has-text-grey">Loading game type details…</p>

        <GameEditorForm
          v-else
          :key="selectedGame?.id || selectedGameType.id"
          :gameType="selectedGameType"
          :existingGame="selectedGame"
          @saved="handleEditorSaved"
          @cancel="closeEditor"
          @dirty-change="handleEditorDirtyChange"
        />
      </section>
    </div>
  </div>

  <div class="modal" :class="{ 'is-active': isDailyChallengesOpen }">
    <div class="modal-background" @click="closeDailyChallenges"></div>
    <div class="modal-card daily-challenges-modal">
      <header class="modal-card-head">
        <p class="modal-card-title">Daily challenges</p>
        <button class="delete" aria-label="close" @click="closeDailyChallenges"></button>
      </header>
      <section class="modal-card-body" v-if="selectedDailyChallengeGame">
        <DailyChallengesManager
          :game="selectedDailyChallengeGame"
          @close="closeDailyChallenges"
          @dirty-change="handleDailyChallengesDirtyChange"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { collection, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { Game, GameType } from '@top-x/shared/types/game';
import { formatNumber } from '@top-x/shared/utils/format';
import GameEditorForm from '@/components/games/GameEditorForm.vue';
import DailyChallengesManager from '@/components/games/DailyChallengesManager.vue';

const games = ref<Game[]>([]);
const unsubscribe = ref<(() => void) | null>(null);
const gameTypes = ref<GameType[]>([]);
const gameTypesUnsubscribe = ref<(() => void) | null>(null);
const isEditorOpen = ref(false);
const selectedGame = ref<Game | null>(null);
const selectedGameTypeId = ref('');
const isDeletingId = ref<string | null>(null);
const isDailyChallengesOpen = ref(false);
const selectedDailyChallengeGame = ref<Game | null>(null);
const isEditorDirty = ref(false);
const isDailyChallengesDirty = ref(false);

const formatCounter = (value?: number) => formatNumber(value ?? 0);

onMounted(() => {
  const gamesQuery = query(collection(db, 'games'));
  unsubscribe.value = onSnapshot(gamesQuery, (snapshot) => {
    games.value = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Game',
        description: data.description || '',
        gameTypeId: data.gameTypeId || '',
        active: data.active ?? false,
        image: data.image || '',
        vip: data.vip || [],
        custom: data.custom || {},
        language: data.language || 'en',
        counters: data.counters || {},
        community: data.community ?? false,
        shareLink: data.shareLink,
        dailyChallengeActive: data.dailyChallengeActive,
      } as Game;
    });
  });

  const gameTypesQuery = query(collection(db, 'gameTypes'));
  gameTypesUnsubscribe.value = onSnapshot(gameTypesQuery, (snapshot) => {
    gameTypes.value = snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as GameType) }));
  });
});

onBeforeUnmount(() => {
  if (unsubscribe.value) {
    unsubscribe.value();
    unsubscribe.value = null;
  }
  if (gameTypesUnsubscribe.value) {
    gameTypesUnsubscribe.value();
    gameTypesUnsubscribe.value = null;
  }
});

const sortedGames = computed(() =>
  [...games.value].sort(
    (a, b) => (b.counters?.totalPlayers || 0) - (a.counters?.totalPlayers || 0),
  ),
);

const selectedGameType = computed(() => gameTypes.value.find((type) => type.id === selectedGameTypeId.value) || null);

watch(
  () => selectedGame.value,
  (value) => {
    if (value) {
      selectedGameTypeId.value = value.gameTypeId;
    }
  },
);

watch(
  () => gameTypes.value,
  (types) => {
    if (isEditorOpen.value && !selectedGame.value && !selectedGameTypeId.value && types.length) {
      selectedGameTypeId.value = types[0].id;
    }
  },
);

watch(
  () => games.value,
  (value) => {
    if (!selectedDailyChallengeGame.value) return;
    const updated = value.find((game) => game.id === selectedDailyChallengeGame.value?.id);
    if (updated) {
      selectedDailyChallengeGame.value = updated;
    }
  },
);

const openCreateGame = () => {
  selectedGame.value = null;
  selectedGameTypeId.value = gameTypes.value[0]?.id ?? '';
  isEditorOpen.value = true;
  isEditorDirty.value = false;
};

const openEditGame = (game: Game) => {
  selectedGame.value = game;
  selectedGameTypeId.value = game.gameTypeId;
  isEditorOpen.value = true;
  isEditorDirty.value = false;
};

const openDailyChallenges = (game: Game) => {
  selectedDailyChallengeGame.value = game;
  isDailyChallengesOpen.value = true;
  isDailyChallengesDirty.value = false;
};

const closeEditor = (event?: Event) => {
  event?.preventDefault();
  if (isEditorDirty.value && !confirm('Are you sure you want to close without save?')) {
    return;
  }
  isEditorOpen.value = false;
  selectedGame.value = null;
  selectedGameTypeId.value = '';
  isEditorDirty.value = false;
};

const handleEditorSaved = () => {
  isEditorDirty.value = false;
  closeEditor();
};

const closeDailyChallenges = (event?: Event) => {
  event?.preventDefault();
  if (isDailyChallengesDirty.value && !confirm('Are you sure you want to close without save?')) {
    return;
  }
  isDailyChallengesOpen.value = false;
  selectedDailyChallengeGame.value = null;
  isDailyChallengesDirty.value = false;
};

const handleEditorDirtyChange = (value: boolean) => {
  isEditorDirty.value = value;
};

const handleDailyChallengesDirtyChange = (value: boolean) => {
  isDailyChallengesDirty.value = value;
};

const confirmDelete = async (game: Game) => {
  if (!confirm(`Delete ${game.name}? This action cannot be undone.`)) {
    return;
  }

  try {
    isDeletingId.value = game.id;
    await deleteDoc(doc(db, 'games', game.id));
  } catch (error) {
    console.error('Failed to delete game', error);
  } finally {
    isDeletingId.value = null;
  }
};
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
}

.table-container {
  margin-top: 2rem;
}

.game-info {
  display: flex;
  flex-direction: column;
}

.game-meta {
  font-size: 0.75rem;
  color: #7a7a7a;
}

.action-buttons {
  justify-content: flex-end;
  gap: 0.5rem;
}

.modal-card {
  width: 90%;
  max-width: 960px;
}

.daily-challenges-modal {
  width: 95%;
  max-width: 1100px;
}
</style>

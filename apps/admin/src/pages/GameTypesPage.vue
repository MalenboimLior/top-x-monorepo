<template>
  <section class="section">
    <div class="container">
      <div class="level">
        <div class="level-left">
          <div>
            <h1 class="title">Game Types</h1>
            <p class="subtitle">Manage game templates and default configurations</p>
          </div>
        </div>
        <div class="level-right">
          <button class="button is-primary" @click="openCreateGameType">Add Game Type</button>
        </div>
      </div>

      <div class="table-container">
        <table class="table is-fullwidth is-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Config Type</th>
              <th>Available to Build</th>
              <th>Default Configs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gameType in gameTypes" :key="gameType.id">
              <td><strong>{{ gameType.name }}</strong></td>
              <td>{{ gameType.description }}</td>
              <td><code>{{ gameType.custom }}</code></td>
              <td>
                <span class="tag" :class="gameType.availableToBuild ? 'is-success' : 'is-light'">
                  {{ gameType.availableToBuild ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <span class="tag is-info">
                  {{ (gameType.defaultConfigs?.filter(dc => dc.show).length || 0) }} visible
                </span>
              </td>
              <td>
                <button class="button is-small" @click="openEditGameType(gameType)">Edit</button>
              </td>
            </tr>
            <tr v-if="!gameTypes.length">
              <td colspan="6" class="has-text-centered has-text-grey">No game types found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Game Type Editor Modal -->
    <div class="modal" :class="{ 'is-active': isEditorOpen }">
      <div class="modal-background" @click="closeEditor"></div>
      <div class="modal-card" style="max-width: 90vw; width: 1200px;">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ selectedGameType ? 'Edit Game Type' : 'Add Game Type' }}</p>
          <button class="delete" aria-label="close" @click="closeEditor"></button>
        </header>
        <section class="modal-card-body">
          <GameTypeEditorForm
            v-if="selectedGameType"
            :gameType="selectedGameType"
            :games="games"
            @saved="handleEditorSaved"
            @cancel="closeEditor"
          />
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@top-x/shared';
import GameTypeEditorForm from '@/components/games/GameTypeEditorForm.vue';
import type { GameType, Game } from '@top-x/shared/types/game';

const gameTypes = ref<GameType[]>([]);
const games = ref<Game[]>([]);
const selectedGameType = ref<GameType | null>(null);
const isEditorOpen = ref(false);
let gameTypesUnsubscribe: (() => void) | null = null;
let gamesUnsubscribe: (() => void) | null = null;

onMounted(() => {
  const gameTypesQuery = query(collection(db, 'gameTypes'));
  gameTypesUnsubscribe = onSnapshot(gameTypesQuery, (snapshot) => {
    gameTypes.value = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as GameType),
    }));
  });

  const gamesQuery = query(collection(db, 'games'));
  gamesUnsubscribe = onSnapshot(gamesQuery, (snapshot) => {
    games.value = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Game),
    }));
  });
});

onBeforeUnmount(() => {
  if (gameTypesUnsubscribe) {
    gameTypesUnsubscribe();
  }
  if (gamesUnsubscribe) {
    gamesUnsubscribe();
  }
});

function openCreateGameType() {
  selectedGameType.value = {
    id: '',
    name: '',
    description: '',
    custom: 'TriviaConfig',
    availableToBuild: true,
    defaultConfigs: [],
  };
  isEditorOpen.value = true;
}

function openEditGameType(gameType: GameType) {
  selectedGameType.value = { ...gameType };
  isEditorOpen.value = true;
}

function closeEditor() {
  isEditorOpen.value = false;
  selectedGameType.value = null;
}

function handleEditorSaved() {
  closeEditor();
}
</script>

<style scoped>
.table-container {
  margin-top: 2rem;
}
</style>
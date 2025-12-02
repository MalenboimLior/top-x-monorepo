<template>
  <div class="game-type-editor-form">
    <div class="tabs is-boxed">
      <ul>
        <li :class="{ 'is-active': activeTab === 'general' }">
          <a @click="activeTab = 'general'">General</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'defaults' }">
          <a @click="activeTab = 'defaults'">Default Configs</a>
        </li>
      </ul>
    </div>

    <div v-if="activeTab === 'general'" class="columns is-multiline mt-4">
      <div class="column is-half">
        <div class="field">
          <label class="label">Name</label>
          <div class="control">
            <input
              class="input"
              type="text"
              v-model="localGameType.name"
              placeholder="Enter game type name"
            />
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label">Config Type</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select v-model="localGameType.custom">
                <option value="TriviaConfig">TriviaConfig</option>
                <option value="PyramidConfig">PyramidConfig</option>
                <option value="ZoneRevealConfig">ZoneRevealConfig</option>
                <option value="PacmanConfig">PacmanConfig</option>
                <option value="FisherGameConfig">FisherGameConfig</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="column is-full">
        <div class="field">
          <label class="label">Description</label>
          <div class="control">
            <textarea
              class="textarea"
              v-model="localGameType.description"
              placeholder="Enter description"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="column is-half">
        <div class="field">
          <label class="label">Available to Build</label>
          <label class="checkbox">
            <input type="checkbox" v-model="localGameType.availableToBuild" />
            Allow users to build games with this type
          </label>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'defaults'" class="mt-4">
      <div class="level">
        <div class="level-left">
          <div>
            <h3 class="title is-5">Default Configurations</h3>
            <p class="subtitle is-6">Templates that users can start from when creating games</p>
          </div>
        </div>
        <div class="level-right">
          <button class="button is-primary" @click="openAddFromGame">Add from Game</button>
        </div>
      </div>

      <div v-if="!localGameType.defaultConfigs || localGameType.defaultConfigs.length === 0" class="notification is-light">
        No default configurations yet. Add one from an existing game or create a new one.
      </div>

      <div v-else class="table-container">
        <table class="table is-fullwidth is-striped">
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>Name</th>
              <th>Order</th>
              <th>Show in Builder</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(defaultConfig, index) in sortedDefaultConfigs"
              :key="index"
            >
              <td>
                <figure class="image is-64x64" style="margin: 0;">
                  <img
                    v-if="defaultConfig.image"
                    :src="defaultConfig.image"
                    :alt="defaultConfig.name"
                    style="object-fit: cover; border-radius: 4px;"
                  />
                  <div
                    v-else
                    style="width: 64px; height: 64px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;"
                  >
                    No image
                  </div>
                </figure>
              </td>
              <td><strong>{{ defaultConfig.name }}</strong></td>
              <td>
                <input
                  class="input is-small"
                  type="number"
                  v-model.number="defaultConfig.order"
                  style="width: 80px;"
                  @change="saveGameType"
                />
              </td>
              <td>
                <label class="checkbox">
                  <input
                    type="checkbox"
                    v-model="defaultConfig.show"
                    @change="saveGameType"
                  />
                </label>
              </td>
              <td>
                <button class="button is-small" @click="openEditDefaultConfig(index)">
                  Edit
                </button>
                <button class="button is-small is-danger" @click="removeDefaultConfig(index)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="buttons mt-5">
      <button class="button is-primary" :class="{ 'is-loading': isSaving }" @click="saveGameType">
        {{ selectedGameTypeId ? 'Save changes' : 'Create game type' }}
      </button>
      <button class="button" @click="$emit('cancel')">Cancel</button>
    </div>

    <!-- Add from Game Modal -->
    <div class="modal" :class="{ 'is-active': isAddFromGameOpen }">
      <div class="modal-background" @click="closeAddFromGame"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Add Default Config from Game</p>
          <button class="delete" aria-label="close" @click="closeAddFromGame"></button>
        </header>
        <section class="modal-card-body">
          <div class="field">
            <label class="label">Select Game</label>
            <div class="control">
              <div class="select is-fullwidth">
                <select v-model="selectedGameForDefault">
                  <option value="" disabled>Choose a game</option>
                  <option
                    v-for="game in matchingGames"
                    :key="game.id"
                    :value="game.id"
                  >
                    {{ game.name }} ({{ game.id }})
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="field">
            <label class="label">Default Config Name</label>
            <div class="control">
              <input
                class="input"
                type="text"
                v-model="newDefaultConfigName"
                placeholder="e.g., How well do you know me?"
              />
            </div>
          </div>
          <div class="field">
            <label class="label">Order</label>
            <div class="control">
              <input
                class="input"
                type="number"
                v-model.number="newDefaultConfigOrder"
                placeholder="Display order"
              />
            </div>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button is-primary" @click="addDefaultFromGame" :disabled="!selectedGameForDefault || !newDefaultConfigName">
            Add
          </button>
          <button class="button" @click="closeAddFromGame">Cancel</button>
        </footer>
      </div>
    </div>

    <!-- Edit Default Config Modal -->
    <div class="modal" :class="{ 'is-active': isEditDefaultOpen && editingDefaultConfig }">
      <div class="modal-background" @click="closeEditDefault"></div>
      <div v-if="editingDefaultConfig" class="modal-card" style="max-width: 90vw; width: 1200px;">
        <header class="modal-card-head">
          <p class="modal-card-title">Edit Default Config: {{ editingDefaultConfig.name }}</p>
          <button class="delete" aria-label="close" @click="closeEditDefault"></button>
        </header>
        <section class="modal-card-body">
          <div class="field">
            <label class="label">Name</label>
            <div class="control">
              <input
                class="input"
                type="text"
                v-model="editingDefaultConfig.name"
              />
            </div>
          </div>
          <div class="field">
            <label class="label">Thumbnail Image</label>
            <p class="help">Preview image shown to users when selecting this template</p>
            <div class="control">
              <ImageUploader
                v-model="editingDefaultConfig.image"
                uploadFolder="default-configs"
                :cropWidth="512"
                :cropHeight="320"
              />
            </div>
          </div>
          <div class="field">
            <label class="label">Order</label>
            <div class="control">
              <input
                class="input"
                type="number"
                v-model.number="editingDefaultConfig.order"
              />
            </div>
          </div>
          <div class="field">
            <label class="checkbox">
              <input type="checkbox" v-model="editingDefaultConfig.show" />
              Show in builder
            </label>
          </div>
          <div class="field">
            <label class="label">Configuration</label>
            <DefaultConfigEditor
              :config="editingDefaultConfig.config"
              :configType="localGameType.custom"
              @update:config="editingDefaultConfig.config = $event"
            />
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button is-primary" @click="saveDefaultConfig">Save</button>
          <button class="button" @click="closeEditDefault">Cancel</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@top-x/shared';
import DefaultConfigEditor from './DefaultConfigEditor.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import type { GameType, Game, DefaultConfig, GameCustomConfig } from '@top-x/shared/types/game';

const props = defineProps<{
  gameType: GameType;
  games: Game[];
}>();

const emit = defineEmits(['saved', 'cancel']);

// Create a local reactive copy of gameType to avoid mutating props
const localGameType = ref<GameType>(JSON.parse(JSON.stringify(props.gameType)));

// Watch for prop changes and update local copy
watch(
  () => props.gameType,
  (newGameType) => {
    localGameType.value = JSON.parse(JSON.stringify(newGameType));
  },
  { deep: true }
);

const activeTab = ref<'general' | 'defaults'>('general');
const isSaving = ref(false);
const isAddFromGameOpen = ref(false);
const isEditDefaultOpen = ref(false);
const selectedGameForDefault = ref('');
const newDefaultConfigName = ref('');
const newDefaultConfigOrder = ref(0);
const editingDefaultIndex = ref<number | null>(null);
const editingDefaultConfig = ref<DefaultConfig | null>(null);

const selectedGameTypeId = computed(() => localGameType.value.id);

const matchingGames = computed(() => {
  // Filter games that match the current game type's custom config type
  // We check the structure of the custom config to match
  return props.games.filter((game) => {
    const gameCustom = game.custom;
    const expectedType = localGameType.value.custom;
    
    // Simple type checking based on config structure
    if (expectedType === 'TriviaConfig' && 'questions' in gameCustom) return true;
    if (expectedType === 'PyramidConfig' && 'items' in gameCustom) return true;
    if (expectedType === 'ZoneRevealConfig' && 'levelsConfig' in gameCustom) return true;
    if (expectedType === 'PacmanConfig' && 'version' in gameCustom) return true;
    if (expectedType === 'FisherGameConfig' && 'levelsConfig' in gameCustom && 'fishermanImage' in gameCustom) return true;
    
    return false;
  });
});

const sortedDefaultConfigs = computed(() => {
  if (!localGameType.value.defaultConfigs) return [];
  return [...localGameType.value.defaultConfigs].sort((a, b) => a.order - b.order);
});

// Helper function to remove undefined values from objects/arrays (Firestore doesn't accept undefined)
function removeUndefined<T>(value: T): T {
  // Handle primitives and null
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  
  // Handle arrays - clean each element and filter out undefined items
  if (Array.isArray(value)) {
    return value
      .map(removeUndefined)
      .filter((item) => item !== undefined) as T;
  }
  
  // Handle objects - remove properties with undefined values
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const cleanedVal = removeUndefined(val);
    if (cleanedVal !== undefined) {
      cleaned[key] = cleanedVal;
    }
  }
  return cleaned as T;
}

async function saveGameType() {
  if (isSaving.value) return;
  
  try {
    isSaving.value = true;
    const gameTypeData = {
      name: localGameType.value.name,
      description: localGameType.value.description,
      custom: localGameType.value.custom,
      availableToBuild: localGameType.value.availableToBuild,
      defaultConfigs: localGameType.value.defaultConfigs || [],
    };
    
    // Remove undefined values before saving to Firestore
    const cleanedData = removeUndefined(gameTypeData);

    if (selectedGameTypeId.value) {
      // Update existing
      const gameTypeRef = doc(db, 'gameTypes', selectedGameTypeId.value);
      await updateDoc(gameTypeRef, cleanedData);
    } else {
      // Create new
      await addDoc(collection(db, 'gameTypes'), cleanedData);
    }

    emit('saved');
  } catch (error) {
    console.error('Error saving game type:', error);
    alert('Failed to save game type. Please try again.');
  } finally {
    isSaving.value = false;
  }
}

function openAddFromGame() {
  selectedGameForDefault.value = '';
  newDefaultConfigName.value = '';
  newDefaultConfigOrder.value = (props.gameType.defaultConfigs?.length || 0) + 1;
  isAddFromGameOpen.value = true;
}

function closeAddFromGame() {
  isAddFromGameOpen.value = false;
  selectedGameForDefault.value = '';
  newDefaultConfigName.value = '';
  newDefaultConfigOrder.value = 0;
}

function addDefaultFromGame() {
  if (!selectedGameForDefault.value || !newDefaultConfigName.value) return;

  const selectedGame = props.games.find((g) => g.id === selectedGameForDefault.value);
  if (!selectedGame) return;

  // Deep clone the custom config
  const clonedConfig = JSON.parse(JSON.stringify(selectedGame.custom)) as GameCustomConfig;

    const newDefault: DefaultConfig = {
      name: newDefaultConfigName.value,
      config: clonedConfig,
      show: true,
      order: newDefaultConfigOrder.value || (localGameType.value.defaultConfigs?.length || 0) + 1,
      ...(selectedGame.image && { image: selectedGame.image }), // Include game image if available
    };

    if (!localGameType.value.defaultConfigs) {
      localGameType.value.defaultConfigs = [];
    }
    localGameType.value.defaultConfigs.push(newDefault);

  saveGameType();
  closeAddFromGame();
}

function openEditDefaultConfig(index: number) {
  if (!localGameType.value.defaultConfigs) return;
  
  const defaultConfig = localGameType.value.defaultConfigs[index];
  editingDefaultConfig.value = JSON.parse(JSON.stringify(defaultConfig));
  editingDefaultIndex.value = index;
  isEditDefaultOpen.value = true;
}

function closeEditDefault() {
  isEditDefaultOpen.value = false;
  editingDefaultConfig.value = null;
  editingDefaultIndex.value = null;
}

function saveDefaultConfig() {
  if (editingDefaultIndex.value === null || !editingDefaultConfig.value || !localGameType.value.defaultConfigs) return;

  localGameType.value.defaultConfigs[editingDefaultIndex.value] = JSON.parse(JSON.stringify(editingDefaultConfig.value));
  saveGameType();
  closeEditDefault();
}

function removeDefaultConfig(index: number) {
  if (!confirm('Are you sure you want to delete this default config?')) return;
  if (!localGameType.value.defaultConfigs) return;

  localGameType.value.defaultConfigs.splice(index, 1);
  saveGameType();
}
</script>

<style scoped>
.table-container {
  margin-top: 1rem;
}
</style>

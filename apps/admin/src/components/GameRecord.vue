<template>
  <Card>
    <h2 class="subtitle has-text-white">{{ game.id ? 'Edit' : 'Create' }} Game</h2>
    <div class="field">
      <label class="label has-text-white">Game ID</label>
      <div class="control">
        <input v-model="localGame.id" class="input" type="text" placeholder="e.g., smartest_on_x" :disabled="!!game.id" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Name</label>
      <div class="control">
        <input v-model="localGame.name" class="input" type="text" placeholder="e.g., Smartest on X" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Description</label>
      <div class="control">
        <textarea v-model="localGame.description" class="textarea" placeholder="Describe the game"></textarea>
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Game Header (Optional)</label>
      <div class="control">
        <input v-model="localGame.gameHeader" class="input" type="text" placeholder="e.g., Welcome to the Game" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Share Text (Optional)</label>
      <div class="control">
        <input v-model="localGame.shareText" class="input" type="text" placeholder="e.g., Share your score!" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Game Instruction (Optional)</label>
      <div class="control">
        <input v-model="localGame.gameInstruction" class="input" type="text" placeholder="How to play" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Language</label>
      <div class="control select">
        <select v-model="localGame.language">
          <option value="en">English</option>
          <option value="il">Hebrew</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Share Link (Optional)</label>
      <div class="control">
        <input v-model="localGame.shareLink" class="input" type="text" placeholder="https://example.com" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Image URL</label>
      <div class="control">
        <input v-model="localGame.image" class="input" type="text" placeholder="https://example.com/image.png" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Active</label>
      <div class="control">
        <input type="checkbox" v-model="localGame.active" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">VIP User ID</label>
      <div class="control has-addons">
        <input v-model="vipInput" class="input" type="text" placeholder="Add UID" @keyup.enter="addVip" />
        <CustomButton type="is-info" label="Add" @click="addVip" />
      </div>
      <div class="mt-2">
        <span v-for="id in vipList" :key="id" class="tag is-info mr-1">
          {{ id }}
          <button class="delete is-small" @click="removeVip(id)"></button>
        </span>
      </div>
    </div>
    <div v-if="gameTypeCustom === 'PyramidConfig'">
      <h3 class="subtitle has-text-white">Pyramid Config</h3>
      <p class="has-text-grey-light">Rows are managed in the Rows tab.</p>

      <div class="field">
        <label class="label has-text-white">Sort Items By</label>
        <div class="control select">
          <select v-model="(localGame.custom as PyramidConfig).sortItems.orderBy">
            <option value="id">ID</option>
            <option value="label">Label</option>
            <option value="color">Color</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Sort Order</label>
        <div class="control select">
          <select v-model="(localGame.custom as PyramidConfig).sortItems.order">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
        <div class="field">
          <label class="label has-text-white">Hide Row Labels</label>
          <div class="control">
            <input type="checkbox" v-model="(localGame.custom as PyramidConfig).HideRowLabel" />
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white">Share Image Title (Optional)</label>
          <div class="control">
            <input v-model="(localGame.custom as PyramidConfig).shareImageTitle" class="input" type="text" placeholder="Title shown on shared image" />
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white">Pool Header (Optional)</label>
          <div class="control">
            <input v-model="(localGame.custom as PyramidConfig).poolHeader" class="input" type="text" placeholder="e.g., Question Pool" />
          </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Community Header (Optional)</label>
        <div class="control">
          <input v-model="(localGame.custom as PyramidConfig).communityHeader" class="input" type="text" placeholder="e.g., Community Picks" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Worst Header (Optional)</label>
        <div class="control">
          <input v-model="(localGame.custom as PyramidConfig).worstHeader" class="input" type="text" placeholder="e.g., Key Terms" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Worst Points</label>
        <div class="control">
          <input v-model.number="(localGame.custom as PyramidConfig).worstPoints" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Show Worst Item</label>
        <div class="control">
          <input type="checkbox" v-model="(localGame.custom as PyramidConfig).worstShow" />
        </div>
      </div>
    </div>
    <div v-if="gameTypeCustom === 'TriviaConfig'">
      <h3 class="subtitle has-text-white">Trivia Config</h3>
      <p class="has-text-grey-light">Questions will be managed separately.</p>
    </div>
    <div v-if="gameTypeCustom === 'TerritoryCaptureConfig'">
      <h3 class="subtitle has-text-white">Territory Capture Config</h3>
      <div class="field">
        <label class="label has-text-white">Background Image URL</label>
        <div class="control">
          <input v-model="(localGame.custom as any).backgroundImage" class="input" type="text" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Player Asset URL</label>
        <div class="control">
          <input v-model="(localGame.custom as any).playerAsset" class="input" type="text" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Player Speed</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).playerSpeed" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Player Scale</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).playerScale" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Enemy Assets (comma separated)</label>
        <div class="control">
          <textarea v-model="enemyAssetsText" class="textarea"></textarea>
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Enemy Speed</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).enemySpeed" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Enemy Count</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).enemyCount" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Enemy Movements (comma separated)</label>
        <div class="control">
          <input v-model="enemyMovementsText" class="input" type="text" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Screen Width</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).screenWidth" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Screen Height</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).screenHeight" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Win Percentage</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).winPercentage" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Lives</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).lives" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Brush Size</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).brushSize" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Power Ups JSON</label>
        <div class="control">
          <textarea v-model="powerUpsText" class="textarea"></textarea>
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Power Up Count</label>
        <div class="control">
          <input v-model.number="(localGame.custom as any).powerUpCount" class="input" type="number" />
        </div>
      </div>
    </div>
    <div v-if="gameTypeCustom === 'ZoneBreakerConfig'">
      <h3 class="subtitle has-text-white">ZoneBreaker Config</h3>
      <div class="field">
        <label class="label has-text-white">Config JSON</label>
        <div class="control">
          <textarea v-model="zoneBreakerConfigText" class="textarea" rows="10"></textarea>
        </div>
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <CustomButton type="is-primary" label="Save" @click="save" :disabled="isSaving" />
      </div>
      <div class="control">
        <CustomButton type="is-light" label="Cancel" @click="$emit('cancel')" />
      </div>
    </div>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
    <p v-if="customError" class="notification is-danger">{{ customError }}</p>
    <p v-if="success" class="notification is-success">{{ success }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { Game, ConfigType } from '@top-x/shared/types/game';
import type { PyramidConfig,PyramidRow } from '@top-x/shared/types';
import type { TriviaConfig } from '@top-x/shared/types';
import type { TerritoryCaptureConfig } from '@top-x/shared/types/territoryCapture';
import type { ZoneBreakerConfig } from '@top-x/shared/types/zoneBreaker';

const DEFAULT_ZONEBREAKER_CONFIG: ZoneBreakerConfig = {
  levels: [
    {
      backgroundImage: 'https://storage.googleapis.com/your-bucket/level1-bg.jpg',
      enemyTypes: [
        {
          type: 'core',
          asset: 'https://storage.googleapis.com/your-bucket/core-enemy.png',
          speed: 150,
          behavior: 'roam',
        },
        {
          type: 'chaser',
          asset: 'https://storage.googleapis.com/your-bucket/chaser.png',
          speed: 200,
          behavior: 'borderChase',
        },
      ],
      enemyCount: 3,
      powerUpCount: 2,
    },
  ],
  winPercentage: 75,
  playerSpeed: 300,
  enemySpeed: 200,
  enemyCount: 3,
  powerUps: [
    { type: 'speed', asset: 'https://storage.googleapis.com/your-bucket/speed.png' },
    { type: 'shield', asset: 'https://storage.googleapis.com/your-bucket/shield.png' },
  ],
  lineStyle: 'solid',
  trailDecay: 10,
  lives: 3,
  mode: 'arcade',
  screenWidth: 800,
  screenHeight: 600,
  brushSize: 2,
};

const props = defineProps<{
  game: Game;
  gameTypeId: string | null;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

const userStore = useUserStore();
const localGame = ref<Game>({ language: 'en', image: '', active: false, vip: [], ...props.game });
const vipList = ref<string[]>([...(localGame.value.vip || [])]);
const vipInput = ref('');
const enemyAssetsText = ref('');
const enemyMovementsText = ref('');
const powerUpsText = ref('');
const zoneBreakerConfigText = ref('');
if (
  'custom' in localGame.value &&
  (localGame.value.custom as any) &&
  !(localGame.value.custom as any).sortItems
) {
  (localGame.value.custom as PyramidConfig).sortItems = { orderBy: 'id', order: 'asc' };
}
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).HideRowLabel === undefined
  ) {
    (localGame.value.custom as PyramidConfig).HideRowLabel = false;
  }
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).shareImageTitle === undefined
  ) {
    (localGame.value.custom as PyramidConfig).shareImageTitle = '';
  }
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).poolHeader === undefined
  ) {
  (localGame.value.custom as PyramidConfig).poolHeader = '';
}
if (
  'custom' in localGame.value &&
  (localGame.value.custom as any) &&
  (localGame.value.custom as any).worstHeader === undefined
) {
  (localGame.value.custom as PyramidConfig).worstHeader = '';
}
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).worstPoints === undefined
  ) {
    (localGame.value.custom as PyramidConfig).worstPoints = 0;
  }
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).worstShow === undefined
  ) {
    (localGame.value.custom as PyramidConfig).worstShow = true;
  }
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).communityItems === undefined
  ) {
    (localGame.value.custom as PyramidConfig).communityItems = [];
  }
  if (
    'custom' in localGame.value &&
    (localGame.value.custom as any) &&
    (localGame.value.custom as any).communityHeader === undefined
  ) {
    (localGame.value.custom as PyramidConfig).communityHeader = '';
  }
  if (localGame.value.gameInstruction === undefined) {
    (localGame.value as any).gameInstruction = '';
  }
  if (localGame.value.language === undefined) {
    localGame.value.language = 'en';
  }
  if ((localGame.value as any).shareLink === undefined) {
    (localGame.value as any).shareLink = '';
  }
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const customError = ref<string | null>(null);

const isAdmin = computed(() => {
  const adminStatus = userStore.user?.isAdmin || false;
  console.log('isAdmin check:', { user: userStore.user, isAdmin: adminStatus });
  return adminStatus;
});

const gameTypeCustom = ref<ConfigType | null>(null);

const addVip = () => {
  const id = vipInput.value.trim();
  if (id && !vipList.value.includes(id)) {
    vipList.value.push(id);
    localGame.value.vip = vipList.value;
    vipInput.value = '';
  }
};

const removeVip = (id: string) => {
  vipList.value = vipList.value.filter(v => v !== id);
  localGame.value.vip = vipList.value;
};

const fetchGameTypeCustom = async () => {
  console.log('fetchGameTypeCustom called with gameTypeId:', props.gameTypeId);
  if (props.gameTypeId) {
    try {
      const gameTypeDoc = await getDoc(doc(db, 'gameTypes', props.gameTypeId));
      console.log('GameType doc fetched:', { exists: gameTypeDoc.exists(), id: props.gameTypeId });
      if (gameTypeDoc.exists()) {
        gameTypeCustom.value = gameTypeDoc.data().custom as ConfigType;
        console.log('gameTypeCustom set:', gameTypeCustom.value);
        if (gameTypeCustom.value === 'TerritoryCaptureConfig') {
          const cfg = localGame.value.custom as Partial<TerritoryCaptureConfig>;
          enemyAssetsText.value = Array.isArray(cfg.enemyAssets)
            ? cfg.enemyAssets.join(', ')
            : '';
          enemyMovementsText.value = Array.isArray(cfg.enemyMovements)
            ? cfg.enemyMovements.join(', ')
            : '';
          powerUpsText.value = cfg.powerUps ? JSON.stringify(cfg.powerUps) : '';
        } else if (gameTypeCustom.value === 'ZoneBreakerConfig') {
          if (!localGame.value.custom || Object.keys(localGame.value.custom).length === 0) {
            localGame.value.custom = { ...DEFAULT_ZONEBREAKER_CONFIG };
          }
          zoneBreakerConfigText.value = JSON.stringify(localGame.value.custom, null, 2);
        }
      } else {
        error.value = 'Game Type not found';
        console.log('GameType not found in Firestore:', props.gameTypeId);
      }
    } catch (err: any) {
      error.value = `Failed to fetch game type: ${err.message}`;
      console.error('fetchGameTypeCustom error:', { error: err.message, code: err.code });
    }
  } else {
    error.value = 'No Game Type ID provided';
    console.log('fetchGameTypeCustom: No gameTypeId provided');
  }
};

const save = async () => {
  console.log('save called with localGame:', localGame.value);
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    console.log('save blocked: User is not admin');
    return;
  }
  if (!props.gameTypeId || !localGame.value.id || !localGame.value.name) {
    error.value = 'Game Type, Game ID, and Name are required';
    console.log('save blocked: Missing required fields', { gameTypeId: props.gameTypeId, id: localGame.value.id, name: localGame.value.name });
    return;
  }
  if (!gameTypeCustom.value) {
    error.value = 'Game Type configuration not loaded';
    console.log('save blocked: gameTypeCustom not set');
    return;
  }
  isSaving.value = true;
  error.value = null;
  success.value = null;
  customError.value = null;

  let customData: PyramidConfig | TriviaConfig | TerritoryCaptureConfig | ZoneBreakerConfig;
  if (gameTypeCustom.value === 'PyramidConfig') {
    console.log('Processing PyramidConfig');
      customData = {
        items: 'items' in (localGame.value.custom || {}) ? (localGame.value.custom as PyramidConfig).items : [],
        rows: 'rows' in (localGame.value.custom || {}) ? (localGame.value.custom as PyramidConfig).rows : [],
        sortItems: 'sortItems' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).sortItems
          : { orderBy: 'id', order: 'asc' },
        HideRowLabel: 'HideRowLabel' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).HideRowLabel
          : false,
        shareImageTitle: 'shareImageTitle' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).shareImageTitle
          : undefined,
        poolHeader: 'poolHeader' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).poolHeader
          : undefined,
        worstHeader: 'worstHeader' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).worstHeader
          : undefined,
        worstPoints: 'worstPoints' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).worstPoints
          : undefined,
        worstShow: 'worstShow' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).worstShow
          : true,
        communityItems:
          'communityItems' in (localGame.value.custom || {})
            ? (localGame.value.custom as PyramidConfig).communityItems
            : ((localGame.value as any).communityItems || []),
        communityHeader: 'communityHeader' in (localGame.value.custom || {})
          ? (localGame.value.custom as PyramidConfig).communityHeader
          : undefined,
      };
    console.log('PyramidConfig customData created:', customData);
  } else if (gameTypeCustom.value === 'TriviaConfig') {
    customData = {
      questions: 'questions' in (localGame.value.custom || {}) ? (localGame.value.custom as TriviaConfig).questions : [],
    };
    console.log('TriviaConfig customData created:', customData);
  } else if (gameTypeCustom.value === 'TerritoryCaptureConfig') {
    customData = {
      backgroundImage: (localGame.value.custom as any).backgroundImage || '',
      playerAsset: (localGame.value.custom as any).playerAsset || '',
      playerSpeed: Number((localGame.value.custom as any).playerSpeed) || 0,
      playerScale: (localGame.value.custom as any).playerScale !== undefined ? Number((localGame.value.custom as any).playerScale) : undefined,
      enemyAssets: enemyAssetsText.value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      enemySpeed: Number((localGame.value.custom as any).enemySpeed) || 0,
      enemyCount: Number((localGame.value.custom as any).enemyCount) || 0,
      enemyMovements: enemyMovementsText.value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0) as ('horizontal' | 'vertical' | 'random')[],
      screenWidth: Number((localGame.value.custom as any).screenWidth) || 0,
      screenHeight: Number((localGame.value.custom as any).screenHeight) || 0,
      winPercentage: Number((localGame.value.custom as any).winPercentage) || 0,
      lives: Number((localGame.value.custom as any).lives) || 0,
      brushSize:
        (localGame.value.custom as any).brushSize !== undefined
          ? Number((localGame.value.custom as any).brushSize)
          : undefined,
      powerUps:
        powerUpsText.value.trim().length > 0
          ? (() => {
              try {
                return JSON.parse(powerUpsText.value);
              } catch {
                customError.value = 'Invalid powerUps JSON';
                return undefined;
              }
            })()
          : undefined,
      powerUpCount:
        (localGame.value.custom as any).powerUpCount !== undefined
          ? Number((localGame.value.custom as any).powerUpCount)
          : undefined,
    } as TerritoryCaptureConfig;
    console.log('TerritoryCaptureConfig customData created:', customData);
  } else if (gameTypeCustom.value === 'ZoneBreakerConfig') {
    try {
      customData = JSON.parse(zoneBreakerConfigText.value) as ZoneBreakerConfig;
    } catch {
      customError.value = 'Invalid ZoneBreakerConfig JSON';
      isSaving.value = false;
      return;
    }
    console.log('ZoneBreakerConfig customData created:', customData);
  } else {
    error.value = 'Invalid game type configuration';
    console.log('save blocked: Invalid gameTypeCustom:', gameTypeCustom.value);
    isSaving.value = false;
    return;
  }

  try {
    const gameData: any = {
      name: localGame.value.name,
      description: localGame.value.description,
      gameTypeId: props.gameTypeId,
      custom: customData,
      gameHeader: localGame.value.gameHeader || null,
      shareText: localGame.value.shareText || null,
      gameInstruction: localGame.value.gameInstruction || null,
      language: localGame.value.language || 'en',
      shareLink: localGame.value.shareLink || null,
      image: localGame.value.image || '',
      active: localGame.value.active || false,
      vip: vipList.value,
    };
    if ((localGame.value as any).communityItems !== undefined) {
      gameData.communityItems = (localGame.value as any).communityItems;
    }
    console.log('Saving game to Firestore:', { id: localGame.value.id, data: gameData });
    await setDoc(doc(db, 'games', localGame.value.id), gameData);
    success.value = `Game '${localGame.value.name}' saved successfully`;
    console.log('Game saved successfully:', gameData);
    emit('save');
  } catch (err: any) {
    error.value = `Failed to save game: ${err.message}`;
    console.error('save error:', { error: err.message, code: err.code });
  } finally {
    isSaving.value = false;
  }
};

fetchGameTypeCustom();
</script>

<style scoped>
.mt-3 {
  margin-top: 1rem;
}</style>
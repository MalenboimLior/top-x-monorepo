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
    <div v-if="gameTypeCustom === 'ZoneRevealConfig'">
      <h3 class="subtitle has-text-white">Zone Reveal Config</h3>

      <div class="field">
        <label class="label has-text-white">Background Image (Optional)</label>
        <div class="control">
          <input v-model="zoneConfig.backgroundImage" class="input" type="text" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Heart Icon (Optional)</label>
        <div class="control">
          <input v-model="zoneConfig.heartIcon" class="input" type="text" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Player Speed (Optional)</label>
        <div class="control">
          <input v-model.number="zoneConfig.playerSpeed" class="input" type="number" />
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Finish Percent (Optional)</label>
        <div class="control">
          <input v-model.number="zoneConfig.finishPercent" class="input" type="number" />
        </div>
      </div>

      <div class="mt-3">
        <h4 class="subtitle has-text-white">Spritesheets</h4>
        <div v-for="(entry, index) in spritesheetEntries" :key="index" class="field is-grouped">
          <div class="control">
            <input v-model="entry.key" class="input" type="text" placeholder="Key" />
          </div>
          <div class="control">
            <input v-model="entry.value" class="input" type="text" placeholder="Path" />
          </div>
          <div class="control">
            <CustomButton type="is-danger" label="Remove" @click="removeSpritesheet(index)" />
          </div>
        </div>
        <CustomButton type="is-info" label="Add" @click="addSpritesheet" />
      </div>

      <div class="mt-3">
        <h4 class="subtitle has-text-white">Enemy Speeds</h4>
        <div v-for="(entry, index) in enemySpeedEntries" :key="index" class="field is-grouped">
          <div class="control">
            <input v-model="entry.key" class="input" type="text" placeholder="Enemy Type" />
          </div>
          <div class="control">
            <input v-model.number="entry.value" class="input" type="number" placeholder="Speed" />
          </div>
          <div class="control">
            <CustomButton type="is-danger" label="Remove" @click="removeEnemySpeed(index)" />
          </div>
        </div>
        <CustomButton type="is-info" label="Add" @click="addEnemySpeed" />
      </div>

      <div class="mt-3">
        <h4 class="subtitle has-text-white">Levels Config</h4>
        <div v-for="(level, lIndex) in zoneConfig.levelsConfig" :key="lIndex" class="box">
          <div class="field">
            <label class="label has-text-white">Level Header</label>
            <div class="control">
              <input v-model="level.levelHeader" class="input" type="text" />
            </div>
          </div>
          <div class="field">
            <label class="label has-text-white">Hidden Image</label>
            <div class="control">
              <input v-model="level.hiddenImage" class="input" type="text" />
            </div>
          </div>
          <div class="field">
            <label class="label has-text-white">Time Limit</label>
            <div class="control">
              <input v-model.number="level.timeLimit" class="input" type="number" />
            </div>
          </div>
          <div>
            <h5 class="subtitle has-text-white">Enemies</h5>
            <div v-for="(enemy, eIndex) in level.enemyConfig" :key="eIndex" class="field is-grouped">
              <div class="control">
                <input v-model="enemy.type" class="input" type="text" placeholder="Type" />
              </div>
              <div class="control">
                <input v-model.number="enemy.count" class="input" type="number" placeholder="Count" />
              </div>
              <div class="control">
                <CustomButton type="is-danger" label="Remove" @click="removeEnemy(lIndex, eIndex)" />
              </div>
            </div>
            <CustomButton type="is-info" label="Add Enemy" @click="addEnemy(lIndex)" />
          </div>
          <div class="mt-3">
            <h5 class="subtitle has-text-white">Powerups</h5>
            <div v-for="(power, pIndex) in level.powerupConfig" :key="pIndex" class="field is-grouped">
              <div class="control">
                <input v-model="power.type" class="input" type="text" placeholder="Type" />
              </div>
              <div class="control">
                <input v-model.number="power.count" class="input" type="number" placeholder="Count" />
              </div>
              <div class="control">
                <CustomButton type="is-danger" label="Remove" @click="removePowerup(lIndex, pIndex)" />
              </div>
            </div>
            <CustomButton type="is-info" label="Add Powerup" @click="addPowerup(lIndex)" />
          </div>
          <div class="field mt-3">
            <CustomButton type="is-danger" label="Remove Level" @click="removeLevel(lIndex)" />
          </div>
        </div>
        <CustomButton type="is-info" label="Add Level" @click="addLevel" />
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
import type { PyramidConfig, ZoneRevealConfig } from '@top-x/shared/types';
import type { TriviaConfig } from '@top-x/shared/types';

const props = defineProps<{
  game: Game;
  gameTypeId: string | null;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

const userStore = useUserStore();
const localGame = ref<Game>({ ...props.game, vip: [], language: props.game.language || 'en' });
const vipList = ref<string[]>([...(localGame.value.vip || [])]);
const vipInput = ref('');
// Zone reveal config form state
const zoneConfig = ref<ZoneRevealConfig>({
  levelsConfig: [],
  backgroundImage: '',
  spritesheets: {},
  playerSpeed: undefined,
  enemiesSpeedArray: {},
  finishPercent: undefined,
  heartIcon: ''
});
const spritesheetEntries = ref<{ key: string; value: string }[]>([]);
const enemySpeedEntries = ref<{ key: string; value: number }[]>([]);
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

const addSpritesheet = () => {
  spritesheetEntries.value.push({ key: '', value: '' });
};
const removeSpritesheet = (index: number) => {
  spritesheetEntries.value.splice(index, 1);
};

const addEnemySpeed = () => {
  enemySpeedEntries.value.push({ key: '', value: 0 });
};
const removeEnemySpeed = (index: number) => {
  enemySpeedEntries.value.splice(index, 1);
};

const addLevel = () => {
  zoneConfig.value.levelsConfig.push({
    enemyConfig: [],
    powerupConfig: [],
    timeLimit: 60,
    hiddenImage: '',
    levelHeader: ''
  });
};
const removeLevel = (index: number) => {
  zoneConfig.value.levelsConfig.splice(index, 1);
};

const addEnemy = (levelIndex: number) => {
  zoneConfig.value.levelsConfig[levelIndex].enemyConfig.push({ type: '', count: 0 });
};
const removeEnemy = (levelIndex: number, enemyIndex: number) => {
  zoneConfig.value.levelsConfig[levelIndex].enemyConfig.splice(enemyIndex, 1);
};

const addPowerup = (levelIndex: number) => {
  zoneConfig.value.levelsConfig[levelIndex].powerupConfig.push({ type: '', count: 0 });
};
const removePowerup = (levelIndex: number, powerIndex: number) => {
  zoneConfig.value.levelsConfig[levelIndex].powerupConfig.splice(powerIndex, 1);
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
        if (gameTypeCustom.value === 'ZoneRevealConfig') {
          const cfg = (localGame.value.custom || { levelsConfig: [] }) as ZoneRevealConfig;
          zoneConfig.value = {
            levelsConfig: cfg.levelsConfig || [],
            backgroundImage: cfg.backgroundImage || '',
            spritesheets: cfg.spritesheets || {},
            playerSpeed: cfg.playerSpeed,
            enemiesSpeedArray: cfg.enemiesSpeedArray || {},
            finishPercent: cfg.finishPercent,
            heartIcon: cfg.heartIcon || ''
          };
          spritesheetEntries.value = Object.entries(zoneConfig.value.spritesheets || {}).map(([key, value]) => ({ key, value }));
          enemySpeedEntries.value = Object.entries(zoneConfig.value.enemiesSpeedArray || {}).map(([key, value]) => ({ key, value }));
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

  let customData: PyramidConfig | TriviaConfig | ZoneRevealConfig;
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
  } else if (gameTypeCustom.value === 'ZoneRevealConfig') {
    customData = {
      levelsConfig: zoneConfig.value.levelsConfig,
      backgroundImage: zoneConfig.value.backgroundImage || undefined,
      spritesheets: Object.fromEntries(spritesheetEntries.value.filter(e => e.key).map(e => [e.key, e.value])),
      playerSpeed: zoneConfig.value.playerSpeed,
      enemiesSpeedArray: Object.fromEntries(enemySpeedEntries.value.filter(e => e.key).map(e => [e.key, e.value])),
      finishPercent: zoneConfig.value.finishPercent,
      heartIcon: zoneConfig.value.heartIcon || undefined
    };
    console.log('ZoneRevealConfig customData created:', customData);
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
}
.box {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
}
</style>
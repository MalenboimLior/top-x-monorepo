<template>
  <div class="build-form">
    <div class="tabs">
      <ul>
        <li :class="{ 'is-active': activeTab === 'general' }">
          <a @click="activeTab = 'general'">General Fields</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'custom' }">
          <a @click="activeTab = 'custom'">Custom Config</a>
        </li>
      </ul>
    </div>

    <div v-if="activeTab === 'general'">
      <div class="field">
        <label class="label has-text-white">Game Name</label>
        <div class="control">
          <input class="input" type="text" v-model="game.name" placeholder="Enter game name" />
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Description</label>
        <div class="control">
          <textarea class="textarea" v-model="game.description" placeholder="Enter description"></textarea>
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Game Image</label>
        <div class="control">
          <ImageUploader
            v-model="game.image"
            :uploadFolder="`images/games/${validatedGameId}`"
            :cropWidth="300"
            :cropHeight="200"
          />
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Language</label>
        <div class="control">
          <div class="select">
            <select v-model="game.language">
              <option value="en">English</option>
              <option value="il">Hebrew</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Game Header</label>
        <div class="control">
          <input class="input" type="text" v-model="game.gameHeader" placeholder="Enter game header" />
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Share Text</label>
        <div class="control">
          <input class="input" type="text" v-model="game.shareText" placeholder="Enter share text" />
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Game Instruction</label>
        <div class="control">
          <textarea class="textarea" v-model="game.gameInstruction" placeholder="Enter instructions"></textarea>
        </div>
      </div>

      <div class="field">
        <label class="label has-text-white">Share Link</label>
        <div class="control">
          <input class="input" type="text" v-model="game.shareLink" placeholder="Enter share link" />
        </div>
      </div>
    </div>

    <div v-else>
      <!-- Custom config based on type -->
      <div v-if="gameType.custom === 'PyramidConfig'">
        <AddPyramid
          v-model="game.custom as PyramidConfig"
          :gameId="props.existingGame?.id || 'temp-' + Date.now()"
        />
      </div>
      <div v-else-if="gameType.custom === 'ZoneRevealConfig'">
        <AddZoneReveal v-model="game.custom as ZoneRevealConfig" />
      </div>
    </div>

    <div class="field is-grouped">
      <div class="control">
        <CustomButton type="is-primary" label="Save" @click="saveGame" />
      </div>
      <div class="control">
        <CustomButton type="is-light" label="Cancel" @click="$emit('cancel')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import AddPyramid from '@/components/build/AddPyramid.vue';
import AddZoneReveal from '@/components/build/AddZoneReveal.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import type { Game, GameType } from '@top-x/shared/types/game';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';
import type { ZoneRevealConfig } from '@top-x/shared/types/zoneReveal';

const props = defineProps<{
  gameType: GameType;
  existingGame?: Game | null;
}>();
const emit = defineEmits(['save', 'cancel']);

const userStore = useUserStore();
const activeTab = ref('general');

// Validate gameId to ensure safe uploadFolder path
const validatedGameId = computed(() => {
  const id = props.existingGame?.id || `temp-${Date.now()}`;
  return id.replace(/[\/\\]/g, '');
});

const game = ref<Game>(props.existingGame ? { ...props.existingGame } : {
  id: '',
  name: '',
  description: '',
  gameTypeId: props.gameType.id,
  active: false,
  language: 'en',
  image: '',
  vip: [],
  custom: getDefaultCustom(props.gameType.custom),
  community: true,
  creator: {
    userid: userStore.user?.uid || '',
    username: userStore.profile?.username || '',
  },
  gameHeader: '',
  shareText: '',
  gameInstruction: '',
  shareLink: '',
});

if (props.existingGame?.custom && 'levelsConfig' in props.existingGame.custom) {
  game.value.custom = withDefaultZoneRevealAnswer(
    JSON.parse(JSON.stringify(props.existingGame.custom)) as ZoneRevealConfig,
  );
}

const createDefaultAnswer = () => ({ solution: '', accepted: [] as string[], image: '' });

function withDefaultZoneRevealAnswer(config: ZoneRevealConfig): ZoneRevealConfig {
  if (!config.answer) {
    config.answer = createDefaultAnswer();
  } else {
    config.answer.accepted = config.answer.accepted ?? [];
  }
  return config;
}

function getDefaultCustom(customType: string): PyramidConfig | ZoneRevealConfig {
  if (customType === 'PyramidConfig') {
    return {
      items: [],
      rows: [],
      sortItems: { orderBy: 'id', order: 'asc' },
      HideRowLabel: false,
      shareImageTitle: '',
      poolHeader: '',
      worstHeader: '',
      worstPoints: 0,
      worstShow: false,
      communityItems: [],
      communityHeader: '',
    };
  } else if (customType === 'ZoneRevealConfig') {
    return withDefaultZoneRevealAnswer({
      levelsConfig: [],
      backgroundImage: '',
      spritesheets: {},
      playerSpeed: 0,
      enemiesSpeedArray: {},
      finishPercent: 0,
      heartIcon: '',
    });
  } else {
    throw new Error('Unknown custom type');
  }
}

async function saveGame() {
  try {
    const data = JSON.parse(JSON.stringify(game.value));
    delete data.id;
    if (props.existingGame && props.existingGame.id) {
      const gameRef = doc(db, 'games', props.existingGame.id);
      await updateDoc(gameRef, data);
    } else {
      await addDoc(collection(db, 'games'), data);
    }
    emit('save', game.value);
  } catch (err) {
    console.error('Error saving game:', err);
  }
}

// Debug initial game data
onMounted(() => {
  console.log('BuildAddNewGame: Mounted with game.custom:', game.value.custom);
  console.log('BuildAddNewGame: Existing game ID:', props.existingGame?.id);
});
</script>

<style scoped>
.build-form {
  background-color: #1e1e1e;
  padding: 1.5rem;
  border-radius: 8px;
}
</style>
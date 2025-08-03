<template>
  <div class="build-add-game">
    <Card>
      <h2 class="title is-4 has-text-white">Build {{ gameType.name }}</h2>
      <div class="field">
        <label class="label has-text-white">Name</label>
        <input v-model="game.name" class="input" />
      </div>
      <div class="field">
        <label class="label has-text-white">Description</label>
        <textarea v-model="game.description" class="textarea" />
      </div>
      <div class="field">
        <label class="label has-text-white">Image URL</label>
        <input v-model="game.image" class="input" />
      </div>
      <div class="field">
        <label class="label has-text-white">Language</label>
        <div class="select">
          <select v-model="game.language">
            <option value="en">English</option>
            <option value="il">Hebrew</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="label has-text-white">Game Header</label>
        <input v-model="game.gameHeader" class="input" />
      </div>
      <div class="field">
        <label class="label has-text-white">Share Text</label>
        <input v-model="game.shareText" class="input" />
      </div>
      <div class="field">
        <label class="label has-text-white">Game Instruction</label>
        <input v-model="game.gameInstruction" class="input" />
      </div>
      <div class="field">
        <label class="label has-text-white">Share Link</label>
        <input v-model="game.shareLink" class="input" />
      </div>

      <component :is="customComponent" v-model="custom" class="mt-4" />

      <div class="field is-grouped mt-4">
        <div class="control">
          <CustomButton type="is-primary" label="Save" @click="save" />
        </div>
        <div class="control">
          <CustomButton type="is-light" label="Cancel" @click="$emit('cancel')" />
        </div>
      </div>
      <p v-if="error" class="notification is-danger">{{ error }}</p>
      <p v-if="success" class="notification is-success">{{ success }}</p>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useUserStore } from '@/stores/user';
import type { GameType, Game, PyramidConfig, ZoneRevealConfig } from '@top-x/shared/types';
import AddPyramid from './AddPyramid.vue';
import AddZoneReveal from './AddZoneReveal.vue';

const props = defineProps<{ gameType: GameType }>();
const emit = defineEmits(['saved', 'cancel']);

const userStore = useUserStore();

const game = ref<Partial<Game>>({
  name: '',
  description: '',
  image: '',
  language: 'en',
  gameHeader: '',
  shareText: '',
  gameInstruction: '',
  shareLink: '',
});

const custom = ref<PyramidConfig | ZoneRevealConfig | Record<string, any>>({} as any);

const customComponent = computed(() => {
  switch (props.gameType.custom) {
    case 'PyramidConfig':
      return AddPyramid;
    case 'ZoneRevealConfig':
      return AddZoneReveal;
    default:
      return null;
  }
});

const error = ref('');
const success = ref('');

async function save() {
  if (!userStore.user || !userStore.profile) {
    error.value = 'You must be logged in';
    return;
  }
  try {
    await addDoc(collection(db, 'games'), {
      name: game.value.name,
      description: game.value.description,
      gameTypeId: props.gameType.id,
      active: true,
      gameHeader: game.value.gameHeader || '',
      shareText: game.value.shareText || '',
      gameInstruction: game.value.gameInstruction || '',
      language: game.value.language || 'en',
      shareLink: game.value.shareLink || '',
      image: game.value.image || '',
      vip: [],
      community: true,
      creator: {
        uid: userStore.user.uid,
        username: userStore.profile.username,
      },
      custom: custom.value,
    });
    success.value = 'Game created!';
    emit('saved');
  } catch (err: any) {
    error.value = err.message;
  }
}
</script>

<style scoped>
.build-add-game { max-width: 800px; margin: auto; }
</style>

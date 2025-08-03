<!-- Component for adding new game -->
<template>
  <div class="build-form">
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
      <label class="label has-text-white">Image URL</label>
      <div class="control">
        <input class="input" type="text" v-model="game.image" placeholder="Enter image URL" />
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

    <!-- Custom config based on type -->
    <div v-if="gameType.custom === 'PyramidConfig'">
      <AddPyramid v-model="game.custom" />
    </div>
    <div v-else-if="gameType.custom === 'ZoneRevealConfig'">
      <AddZoneReveal v-model="game.custom" />
    </div>
    <div v-else-if="gameType.custom === 'TriviaConfig'">
      <AddTrivia v-model="game.custom" />
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
import { ref } from 'vue';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import AddPyramid from './build/AddPyramid.vue';
import AddZoneReveal from './build/AddZoneReveal.vue';
import type { Game, GameType } from '@top-x/shared/types/game';

const props = defineProps<{ gameType: GameType }>();
const emit = defineEmits(['save', 'cancel']);

const userStore = useUserStore();
const game = ref<Partial<Game>>({
  name: '',
  description: '',
  gameTypeId: props.gameType.id,
  active: true,
  language: 'en',
  image: '',
  vip: [],
  custom: {} as any,
  community: true,
  creator: {
    userid: userStore.user?.uid || '',
    username: userStore.profile?.username || '',
  },
});

async function saveGame() {
  try {
    await addDoc(collection(db, 'games'), game.value);
    emit('save', game.value);
  } catch (err) {
    console.error('Error saving game:', err);
  }
}
</script>

<style scoped>
.build-form {
  background-color: #1e1e1e;
  padding: 1.5rem;
  border-radius: 8px;
}
</style>
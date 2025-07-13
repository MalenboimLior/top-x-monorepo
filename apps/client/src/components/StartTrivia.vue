<!-- Start screen for the trivia game -->
<template>
  <div class="start-screen">
    <h1 class="title has-text-white">Trivia Game</h1>
    <p class="subtitle has-text-grey-light">Your Best Score: {{ bestScore }} | Best Streak: {{ bestStreak }}</p>
    <div v-if="inviter" class="notification is-info">
      <div class="media">
        <div class="media-left">
          <figure class="image is-32x32">
            <img :src="inviter.photoURL" alt="Inviter image" class="is-rounded" />
          </figure>
        </div>
        <div class="media-content">
          <p class="has-text-white">
            <strong>{{ inviter.displayName }}</strong> scored {{ inviter.score }}! Can you beat them?
          </p>
        </div>
      </div>
    </div>
    <CustomButton type="is-primary" label="Start Game" :icon="['fas', 'play']" @click="startGame" />
  </div>
</template>

<script setup lang="ts">
// import { defineProps, defineEmits } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

interface Props {
  bestScore: number;
  bestStreak: number;
  inviter: any; // Adjust type as needed based on inviter structure
}

const props = withDefaults(defineProps<Props>(), {
  bestScore: 0,
  bestStreak: 0,
  inviter: null,
});

const emit = defineEmits<{
  (e: 'start-game'): void;
}>();

const startGame = () => {
  // console.log('Start game clicked');
  emit('start-game');
};
</script>

<style scoped>
/* Styles are already imported in Trivia.vue via Trivia.css */
</style>
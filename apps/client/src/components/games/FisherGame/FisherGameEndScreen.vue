// apps/client/src/components/games/FisherGame/FisherGameEndScreen.vue
<template>
  <div class="modal is-active" @click.self="handleTryAgain">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="retry" @click="handleTryAgain"></button>
      <div v-if="isNewBestScore" class="notification is-success new-best-indicator">
        <strong>New best score!</strong> 🏆 Way to level up!
      </div>
      <div class="score-preview">
        <div class="score-block">
          <h2 class="title has-text-white">{{ score }}</h2>
          <p class="subtitle is-6 has-text-grey-light">Final score</p>
        </div>
      </div>
      <template v-if="!userStore.user">
        <h2 class="title has-text-white">Great Score!</h2>
        <p class="mb-4">
          Log in with X to save your score to leaderboard.
        </p>
        <div class="buttons">
          <button class="button is-success" @click="handleLogin">Log in with X</button>
          <button class="button is-text has-text-white" @click="handleTryAgain">🔁 Try Again</button>
        </div>
      </template>
      <template v-else>
        <div class="leaderboards">
          <!-- Leaderboard components -->
        </div>
        <div class="action-buttons">
          <button class="button is-success" @click="handleTryAgain">Play Again</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';

const props = defineProps<{
  score: number;
}>();

const emit = defineEmits(['close', 'login']);

const userStore = useUserStore();
const isNewBestScore = ref(false);

onMounted(() => {
  // Check for new best score
  userStore.updateGameProgress('FisherGame', props.score);
});

const handleTryAgain = () => emit('close');
const handleLogin = () => emit('login');
</script>

<style scoped>
/* Styles similar to ZoneRevealEndScreen.vue */
</style>
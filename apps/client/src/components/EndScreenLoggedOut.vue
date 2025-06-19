<!-- Game over screen for guests -->
<template>
    <div class="gameover-screen">
      <h2 class="title has-text-white">Game Over</h2>
      <Card>
        <p class="has-text-white">You got {{ score }} right with a best streak of {{ sessionBestStreak }}!</p>
        <p v-if="score === bestScore && score > 0" class="has-text-success">New Best Score!</p>
        <p v-if="sessionBestStreak === bestStreak && sessionBestStreak > 0" class="has-text-success">New Best Streak!</p>
        
        <div v-if="inviter" class="notification is-info mt-4">
          <div class="media">
            <div class="media-left">
              <figure class="image is-32x32">
                <img :src="inviter.photoURL" alt="Inviter image" class="is-rounded" />
              </figure>
            </div>
            <div class="media-content">
              <p class="has-text-white">
                You scored {{ score }} against <strong>{{ inviter.displayName }}</strong>'s {{ inviter.score }}!
                <span v-if="score > inviter.score" class="has-text-success">You beat them!</span>
                <span v-else class="has-text-warning">Try again to top their score!</span>
              </p>
            </div>
          </div>
        </div>
        
        <div v-else class="notification is-info mt-4">
          <div class="media">
            <div class="media-left">
              <figure class="image is-32x32">
                <img src="/assets/profile.png" alt="Default profile image" class="is-rounded" />
              </figure>
            </div>
            <div class="media-content">
              <p class="has-text-white">
                Log in to challenge friends and see their scores here!
              </p>
            </div>
          </div>
        </div>
  
        <div class="mt-4">
          <p class="has-text-white">Want to save your score, appear on the leaderboard, and challenge {{ inviter ? inviter.displayName : 'others' }}?</p>
          <CustomButton type="is-primary" label="Login with " :icon="['fab', 'x-twitter']" @click="login" />
          <CustomButton type="is-info" label="Play Again" @click="resetGame" />
        </div>
      </Card>
    </div>
  </template>
  
  <script setup lang="ts">
  // import { defineProps, defineEmits } from 'vue';
  import Card from '@top-x/shared/components/Card.vue';
  import CustomButton from '@top-x/shared/components/CustomButton.vue';
  
  interface Props {
    score: number;
    bestScore: number;
    sessionBestStreak: number;
    bestStreak: number;
    inviter: any;
  }
  
  const props = withDefaults(defineProps<Props>(), {
    score: 0,
    bestScore: 0,
    sessionBestStreak: 0,
    bestStreak: 0,
    inviter: null,
  });
  
  const emit = defineEmits<{
    (e: 'reset-game'): void;
    (e: 'share-score'): void;
    (e: 'login'): void;
  }>();
  
  const resetGame = () => {
    emit('reset-game');
  };
  
  const shareScore = () => {
    emit('share-score');
  };
  
  const login = () => {
    emit('login');
  };
  </script>
  
  <style scoped>
  /* Styles are already imported in Trivia.vue via Trivia.css */
  </style>
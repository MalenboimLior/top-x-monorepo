<!-- Game over screen shown to logged in users -->
<template>
    <div class="gameover-screen">
      <h2 class="title has-text-white">Game Over</h2>
      <Card>
        <p class="has-text-white">You got {{ score }} right with a best streak of {{ sessionBestStreak }}!</p>
        <p v-if="score === bestScore && score > 0" class="has-text-success">New Best Score!</p>
        <p v-if="sessionBestStreak === bestStreak && sessionBestStreak > 0" class="has-text-success">New Best Streak!</p>
        <div v-if="percentileRank > 0" class="mt-4">
          <PercentileRank
            :user-image="userImage"
            :username="userStore.profile?.username || 'Anonymous'"
            :percentile="percentileRank"
            :best-score="bestScore"
            :users-topped="usersTopped"
            :score="score"
          />
        </div>
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
        <div class="buttons mt-4 is-flex is-justified-center is-gap-3">
            <CustomButton type="is-primary" label="Play Again" @click="resetGame" :icon="['fas', 'redo']"/>
        </div>
      </Card>
      <Leaderboard
        title="Top Players"
        :entries="leaderboard"
        :frenemies="userStore.profile?.frenemies || []"
        :current-user-id="userStore.user?.uid"
        @add-frenemy="addToFrenemies"
      />
    </div>
</template>

<script setup lang="ts">
// import { defineProps, defineEmits } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import PercentileRank from '@/components/PercentileRank.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

interface Props {
    score: number;
    bestScore: number;
    sessionBestStreak: number;
    bestStreak: number;
    percentileRank: number;
    usersTopped: number;
    userImage: string;
    inviter: any;
    leaderboard: any[];
}

const props = withDefaults(defineProps<Props>(), {
    score: 0,
    bestScore: 0,
    sessionBestStreak: 0,
    bestStreak: 0,
    percentileRank: 0,
    usersTopped: 0,
    userImage: 'https://via.placeholder.com/32',
    inviter: null,
    leaderboard: () => [],
});

const emit = defineEmits<{
    (e: 'reset-game'): void;
    (e: 'add-to-frenemies', uid: string): void;
}>();

const resetGame = () => {
    emit('reset-game');
};

const addToFrenemies = (uid: string) => {
    emit('add-to-frenemies', uid);
};
</script>

<style scoped>
/* Styles are already imported in Trivia.vue via Trivia.css */
</style>
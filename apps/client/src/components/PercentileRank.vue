<!-- Shows how a user's score ranks globally -->
<template>
  <div class="percentile-rank-container">
    <div class="rank-content">
      <div class="media animate-item" style="--animation-delay: 0s;">
        <div class="media-left">
          <figure class="image is-64x64">
            <img :src="userImage" alt="User image" class="is-rounded" />
          </figure>
        </div>
        <div class="media-content">
          <p class="username has-text-white">{{ usernameWithAt }}</p>
          <p class="score has-text-white">Scored {{ bestScore }} pts!</p>
        </div>
      </div>
      <p class="percentile has-text-white animate-item" style="--animation-delay: 0.2s;">
        🏆 |
        <span v-for="(item, index) in progressBarItems" :key="index" class="progress-char" :class="{ 'filled': item.isFilled }" :style="{ '--char-delay': `${index * 0.1}s` }">
          {{ item.char }}
        </span>
        | {{ percentile }}% 🏆
      </p>
      <p class="rank-text has-text-success animate-item" style="--animation-delay: 0.4s;">
        You're in the top {{ percentile }}% on X! #SmartestOnX
      </p>
      <p class="rank-text has-text-success animate-item" style="--animation-delay: 0.5s;">
        Outscored {{ usersTopped }} players on X!
      </p>
      <p class="challenge has-text-white animate-item" style="--animation-delay: 0.6s;">
        Can you top me? 🔝
      </p>
    </div>
    <div class="buttons mt-4 is-flex is-justified-center animate-item" style="--animation-delay: 0.8s;">
      <CustomButton type="is-info" label="Share Score on " @click="shareScore"  :icon="['fab', 'x-twitter']" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

interface Props {
  userImage: string;
  percentile: number;
  usersTopped: number;
  bestScore: number;
  score: number;
}

const props = withDefaults(defineProps<Props>(), {
  userImage: 'https://www.top-x.co/assets/profile.png',
  percentile: 0,
  usersTopped: 0,
  bestScore: 0,
  score: 0,
});

const userStore = useUserStore();

const usernameWithAt = computed(() => {
  return `@${userStore.profile?.username || 'Anonymous'}`;
});

const progressBarItems = computed(() => {
  const filled = Math.round(props.percentile / 10);
  const empty = 10 - filled;
  const items = [];
  for (let i = 0; i < filled; i++) {
    items.push({ char: '■', isFilled: true });
  }
  for (let i = 0; i < empty; i++) {
    items.push({ char: '□', isFilled: false });
  }
  return items;
});

// For share text, maintain the string format
const progressBarString = computed(() => {
  const filled = Math.round(props.percentile / 10);
  const empty = 10 - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
});

const shareScore = () => {
  if (!userStore.user) {
    // console.log('User not logged in, prompting login');
    userStore.loginWithX();
    return;
  }
  const shareText = `I scored ${props.bestScore} pts in TOP-X Trivia! 🏆\n${progressBarString.value} | Top ${props.percentile}% #SmartestOnX #TriviaChallenge\nOutscored ${props.usersTopped} players! Can you beat me? 🔝\n`;
  const url = `https://top-x.co/games/trivia?inviterUid=${userStore.user.uid}&gameId=trivia&score=${props.bestScore}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}${url}`)}`;
  window.open(tweetUrl, '_blank');
  // console.log('Sharing score on X:', {
    score: props.score,
    percentile: props.percentile,
    usersTopped: props.usersTopped,
    url,
  });
};

// Animation control
const isAnimated = ref(false);

onMounted(() => {
  isAnimated.value = true;
});

watch(
  () => props.percentile,
  () => {
    isAnimated.value = false;
    setTimeout(() => {
      isAnimated.value = true;
    }, 50); // Brief delay to reset animation
  }
);
</script>

<style scoped>
.percentile-rank-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rank-content {
  text-align: center;
  padding: 1rem;
}

.username {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.score {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.percentile {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.rank-text {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.challenge {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.image.is-64x64 {
  width: 64px;
  height: 64px;
}

.is-rounded {
  border-radius: 50%;
}

/* Progress bar character animation */
.progress-char {
  display: inline-block;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.progress-char.filled {
  animation: progress-fill 0.3s ease forwards;
  animation-delay: var(--char-delay);
}

@keyframes progress-fill {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* General item animation */
.animate-item {
  opacity: 0;
  transform: translateY(20px);
  animation: fade-slide 0.5s ease forwards;
  animation-delay: var(--animation-delay);
}

@keyframes fade-slide {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
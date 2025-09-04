<template>
  <div class="modal" :class="{ 'is-active': isActive }">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="close" @click="close"></button>
      <h2 class="title has-text-white">Make It Count!</h2>
      <p class="mb-4">
       Log in with X to:<br>
Make your vote count (no dupes!) ✅:<br>
Unlock full results & friends' votes 👀:<br>
We grab just your username + pic - promise, no funny business. 🔒:<br>

      </p>
      <div class="buttons">
        <button class="button is-success" @click="handleLogin">Log in with X</button>
        <button class="button is-text has-text-white" @click="skip">Skip for now</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData } from '@top-x/shared/types/pyramid';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const props = defineProps<{
  isActive: boolean;
  gameId?: string;
  pendingVote?: PyramidData | null;
  rows?: PyramidRow[];
}>();

const emit = defineEmits<{
  (e: 'login'): void;
  (e: 'skip'): void;
  (e: 'close'): void;
}>();

const userStore = useUserStore();

async function handleLogin() {
  try {
    const success = await userStore.loginWithX();
    if (success && userStore.user && props.gameId) {
      console.log('PyramidLoginPopup: Login successful');
      const voteData = props.pendingVote || JSON.parse(localStorage.getItem(`pyramid_${props.gameId}`) || '{}');
      if (voteData && voteData.pyramid && 'worstItem' in voteData) {
        await saveCachedVote(voteData, userStore.user.uid);
        localStorage.removeItem(`pyramid_${props.gameId}`);
        console.log('PyramidLoginPopup: Vote saved and localStorage cleared');
      }
      if (analytics) {
        logEvent(analytics, 'user_action', { action: 'login', method: 'x_auth', context: 'login_popup', game_id: props.gameId });
      }
      emit('login');
    }
  } catch (err: any) {
    console.error('PyramidLoginPopup: Login error:', err.message);
    alert('Failed to login. Please try again.');
  }
}

async function saveCachedVote(data: PyramidData, userId: string) {
  if (!props.gameId) {
    console.error('PyramidLoginPopup: No gameId provided');
    return;
  }
  const gameTypeId = 'PyramidTier';
  const custom = {
    pyramid: data.pyramid.map((row, index) => ({
      tier: index + 1,
      slots: row.map(slot => slot.image?.id || null)
    })),
    worstItem: data.worstItem ? { id: data.worstItem.id, label: data.worstItem.label, src: data.worstItem.src } : null,
  };
  const score = calculateScore(data.pyramid, data.worstItem);

  await userStore.updateGameProgress(gameTypeId, props.gameId, { score, streak: 0, lastPlayed: new Date().toISOString(), custom });

  console.log('PyramidLoginPopup: Cached vote saved to user progress');
}

function calculateScore(pyramid: PyramidSlot[][], worstItem: PyramidItem | null): number {
  let score = 0;
  pyramid.forEach((row, rowIndex) => {
    const rowPoints = props.rows?.[rowIndex]?.points || 0;
    row.forEach(slot => {
      if (slot.image) {
        score += rowPoints;
      }
    });
  });

  console.log('PyramidLoginPopup: Calculated score:', score);
  return score;
}

const skip = () => {
  console.log('PyramidLoginPopup: Skip clicked');
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'skip_login', context: 'login_popup', game_id: props.gameId });
  }
  emit('skip');
};

const close = () => {
  console.log('PyramidLoginPopup: Close clicked');
  emit('close');
};
</script>

<style scoped>
.modal-content {
  max-width: 400px;
  padding: 2rem !important;
  border-radius: 8px;
}

.delete {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.button.is-success {
  background-color: var(--bulma-success, #c4ff00);
  color: #000;
}

.button.is-text {
  text-decoration: underline;
}
</style>
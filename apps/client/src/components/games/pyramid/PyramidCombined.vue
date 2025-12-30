<template>
  <div class="pyramid-combined">
    <!-- Ad Overlay - Show initially while content loads -->
    <GameAdOverlay
      v-if="showAdOverlay"
      @continue="handleAdContinue"
    />

    <!-- Login Promo (Above user-vote-section) if not logged in -->
    <GameLoginPromo 
      v-if="!userStore.user"
      mode="inline"
      :game-id="gameId"
      context="combined_view"
    />

    <!-- Top Section: User's Vote (Thumbnail) -->
    <div class="user-vote-section">
      <h3 class="vote-title desktop-only">{{ t('games.pyramid.yourVote') }}</h3>
      
      <div class="vote-row">
        <div class="thumbnail-wrapper">
          <PyramidImage
            ref="pyramidImageRef"
            :pyramid="pyramid"
            :worst-item="worstItem"
            :rows="rows"
            :game-header="gameHeader"
            :worst-header="worstHeader"
            :game-title="gameTitle"
            :share-image-title="shareImageTitle"
            :share-text="shareText"
            :share-link="shareLink"
            :hide-row-label="hideRowLabel"
            :worst-show="worstShow"
            :user-profile="{ photoURL: userStore.user?.photoURL || '' }"
            :user-name="userStore.profile?.username"
          />
        </div>

        <div class="buttons-container">
          <ShareButton 
            :share-text="shareText || 'Check out my TOP-X Pyramid ranking! #TOPX'"
            :image-url="imageUrl"
            class="share-btn"
          />
          <a class="edit-btn" @click="editPyramid">
            <font-awesome-icon :icon="['fas', 'pen']" class="mr-1" /> {{ t('games.pyramid.edit') }}
          </a>
        </div>
      </div>
    </div>

    <!-- Stats Section - PyramidStats handles countdown and all states internally -->
    <div v-if="showStats" class="stats-section mt-4">
      <PyramidStats
        :game-id="gameId"
        :items="items"
        :community-items="communityItems"
        :rows="rows"
        :worstPoints="worstPoints ?? 0"
        :game-header="gameHeader"
        :game-title="gameTitle"
        :worst-show="worstShow"
        :hide-login-tab="true"
        :stats-reveal-date="statsRevealDate"
      />
    </div>

    <!-- Community Votes Section - Loaded after stats, shows login tab if not logged in -->
    <div v-if="showResults" class="community-votes-section mt-4">
      <h2 v-if="userStore.user" class="community-votes-header">{{ t('games.pyramid.communityVotes') }}</h2>
      <PyramidResults
        :game-id="gameId"
        :items="items"
        :community-items="communityItems"
        :rows="rows"
        :game-header="gameHeader"
        :worst-header="worstHeader"
        :game-title="gameTitle"
        :share-image-title="shareImageTitle"
        :hide-row-label="hideRowLabel"
        :worst-show="worstShow"
        :share-link="shareLink"
      />
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import PyramidImage from '@/components/games/pyramid/PyramidImage.vue';
import ShareButton from '@/components/ShareButton.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import GameLoginPromo from '@/components/games/shared/GameLoginPromo.vue';
import GameAdOverlay from '@/components/games/common/GameAdOverlay.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { useLocaleStore } from '@/stores/locale';

// Lazy load heavy components to prioritize user-vote-section
const PyramidStats = defineAsyncComponent(() => import('@/components/games/pyramid/PyramidStats.vue'));
const PyramidResults = defineAsyncComponent(() => import('@/components/games/pyramid/PyramidResults.vue'));

library.add(faPen);

const router = useRouter();
const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);
const userStore = useUserStore();
const pyramidImageRef = ref<any>(null);
const imageUrl = computed(() => pyramidImageRef.value?.getImageDataUrl() || null);
const showStats = ref(false);
const showResults = ref(false);
const showAdOverlay = ref(true); // Show ad initially

// Prioritize user-vote-section loading - delay stats and results
onMounted(async () => {
  console.log('PyramidCombined: Component mounted, showing ad overlay');

  // Wait for user-vote-section to render first
  await nextTick();

  // Small delay to ensure user-vote-section is fully rendered
  setTimeout(() => {
    showStats.value = true; // PyramidStats will handle countdown internally
    // Only show results if user is logged in
    if (userStore.user) {
      setTimeout(() => {
        showResults.value = true;
      }, 100);
    }
  }, 200);
});

const props = defineProps<{
  gameId: string;
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  items: PyramidItem[];
  communityItems: PyramidItem[];
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  worstPoints?: number;
  shareImageTitle?: string;
  shareText?: string;
  shareLink?: string;
  worstShow?: boolean;
  statsRevealDate?: string;
}>();

// Countdown logic moved to PyramidStats component

function editPyramid() {
  if (props.gameId) {
    if (analytics) {
      logEvent(analytics, 'user_action', { action: 'edit', game_id: props.gameId });
    }
    router.push({ name: 'PyramidTier', query: { game: props.gameId, edit: 'true' } });
  }
}

function handleAdContinue() {
  console.log('PyramidCombined: Ad overlay dismissed, showing content');
  showAdOverlay.value = false;
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'ad_continue', game_id: props.gameId });
  }
}

async function handleLogin() {
  await userStore.loginWithX();
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'login', method: 'x_auth', context: 'combined_view', game_id: props.gameId });
  }
  // Reload might be needed if state doesn't update cleanly, but store should handle it.
  // location.reload();
}

</script>

<style scoped>
.pyramid-combined {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 500px; /* Limit width on desktop */
  margin: 0 auto;
  padding: 0 1rem;
  box-sizing: border-box;
}

.user-vote-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: radial-gradient(circle at top, rgba(30, 30, 30, 0.8) 0%, rgba(18, 18, 18, 0.95) 100%);
  border-radius: 16px; /* Dofter corners */
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 100%;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.user-vote-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00e8e0, transparent);
  opacity: 0.5;
}

.vote-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.vote-title {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  opacity: 0.9;
}

.thumbnail-wrapper {
  width: 100%;
  max-width: 300px; /* Desktop size */
  pointer-events: none;
  transition: transform 0.3s ease;
}

/* Hover effect for the thumbnail section */
.user-vote-section:hover .thumbnail-wrapper {
  transform: scale(1.02);
}

/* Override/Deep select to ensure PyramidImage scales nicely */
:deep(.pyramid-container) {
  padding: 0.5rem !important;
  /* background, shadow, border now inherited from the View's new style */
}

:deep(.game-header) {
    display: none !important;
}

.buttons-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  width: 100%;
}

.edit-btn {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0.5rem 1rem;
  border-radius: 0.375em;
  /*background: rgba(0, 232, 224, 0.2);*/
  border: 1px solid #00e8e0;
  box-shadow: 0 0 10px rgba(0, 232, 224, 0.3);
  min-height: 2.25em;
  white-space: nowrap;
}
.share-btn {
  min-height: 2.5em;
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.edit-btn:hover {
  color: #fff;
  background: rgba(0, 232, 224, 0.3);
  border-color: #00e8e0;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.5);
  transform: translateY(-2px);
}

/* .login-promo-container removed - replaced by GameLoginPromo component */

.stats-section {
  width: 100%;
  max-width: 100%;
  animation: slideUp 0.6s ease-out;
  box-sizing: border-box;
}

.community-votes-section {
  width: 100%;
  max-width: 100%;
  animation: slideUp 0.6s ease-out;
  box-sizing: border-box;
}

.community-votes-header {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 1.5rem 0 1rem;
  text-align: center;
  letter-spacing: 1px;
}


@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Countdown and overlay styles moved to PyramidStats component */

@media screen and (max-width: 767px) {
  .pyramid-combined {
    padding: 0; /* Full width */
  }
  .user-vote-section {
    padding: 0.75rem 0.5rem; /* Minimal padding */
    border-radius: 0; /* Edge to edge design */
    margin-bottom: 0.5rem;
    border-left: none;
    border-right: none;
  }

  /* Hide the big title on mobile to save space */
  .desktop-only {
    display: none;
  }

  .thumbnail-wrapper {
    /* Smaller image on mobile */
    max-width: 150px;
    width: 100%;
  }

  .buttons-container {
    width: 100%;
    flex-direction: row;
    
    justify-content: center;
    align-items: center;
  }

  .edit-btn {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  .share-btn {
    font-size: 1rem;
    padding: 0.6rem 1.2rem;
  }



  .stats-section {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
    padding-left: 0;
    padding-right: 0;
  }
}
</style>

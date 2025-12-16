<template>
  <div class="pyramid-combined">
    <!-- Top Section: User's Vote (Thumbnail) -->
    <div class="user-vote-section">
      <div class="vote-thumbnail-container">
        <h3 class="vote-title">{{ t('games.pyramid.yourVote') }}</h3>
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
          />
        </div>
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

    <!-- Login Promo (Inline) if not logged in -->
    <div v-if="!userStore.user" class="login-promo-container">
      <div class="login-message">
        <p class="login-title">{{ t('games.pyramid.makeVoteCount') }}</p>
        <p class="login-subtitle">{{ t('games.pyramid.loginToReveal') }}</p>
      </div>
      <CustomButton
        type="is-primary"
        :label="t('games.loginButton')"
        :icon="['fab', 'x-twitter']"
        @click="handleLogin"
      />
    </div>

    <!-- Bottom Section: Results (Stats) -->
    <div class="stats-section mt-4">
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
      />
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import PyramidImage from '@/components/games/pyramid/PyramidImage.vue';
import PyramidStats from '@/components/games/pyramid/PyramidStats.vue';
import ShareButton from '@/components/ShareButton.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { useLocaleStore } from '@/stores/locale';

library.add(faPen);

const router = useRouter();
const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);
const userStore = useUserStore();
const pyramidImageRef = ref<any>(null);
const imageUrl = computed(() => pyramidImageRef.value?.getImageDataUrl() || null);

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
}>();

function editPyramid() {
  if (props.gameId) {
    if (analytics) {
      logEvent(analytics, 'user_action', { action: 'edit', game_id: props.gameId });
    }
    router.push({ name: 'PyramidTier', query: { game: props.gameId, edit: 'true' } });
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
  align-items: center; /* Center everything */
  width: 100%;
  max-width: 1000px; /* Slightly wider for desktop stats */
  margin: 0 auto;
  padding: 0 1rem;
}

.user-vote-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: radial-gradient(circle at top, rgba(30, 30, 30, 0.8) 0%, rgba(18, 18, 18, 0.95) 100%);
  border-radius: 16px; /* Dofter corners */
  padding: 2rem;
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

.vote-thumbnail-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vote-title {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  opacity: 0.9;
}

.thumbnail-wrapper {
  width: 100%;
  max-width: 300px; /* Slightly larger thumbnail */
  /* margin-bottom: 1.5rem; */ /* removed margin */
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
  background: transparent !important; /* Let container bg show */
  box-shadow: none !important; /* Use section shadow instead */
  border: none !important;
}

:deep(.game-header) {
    font-size: 1rem !important;
    margin: 0.5rem 0 !important;
    opacity: 0.8;
}

.buttons-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  width: 100%;
}

.edit-btn {
  color: #bbb;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
}
.edit-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.login-promo-container {
  background: linear-gradient(135deg, rgba(31, 31, 31, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 1px solid #00e8e0;
  box-shadow: 0 0 20px rgba(0, 232, 224, 0.15);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin: 1rem 0 3rem; /* More bottom margin to separate from stats */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  width: 100%;
  max-width: 600px;
}

.login-title {
  color: #00e8e0;
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 0.2rem;
  letter-spacing: 0.5px;
}

.login-subtitle {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.5;
  max-width: 80%;
}

.stats-section {
  width: 100%;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media screen and (max-width: 767px) {
  .pyramid-combined {
    padding: 0 0.2rem; /* Reduced horizontal padding */
  }
  .user-vote-section {
    padding: 1.5rem 0.5rem; /* Reduced horizontal padding */
    border-radius: 12px;
  }
  .thumbnail-wrapper {
    max-width: 100%; /* Allow full width scaling if needed */
    width: auto;
  }
  .login-promo-container {
    padding: 1.5rem 0.5rem; /* Reduced horizontal padding */
    margin-bottom: 2rem;
  }
  .login-subtitle {
    max-width: 100%;
  }
  .buttons-container {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>

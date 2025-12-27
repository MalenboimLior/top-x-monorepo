<template>
  <div class="pyramid-tier">
    <!-- <h1>{{ gameDescription }}</h1> -->
    <PyramidEdit
      v-if="showEdit"
      :items="items"
      :community-items="communityItems"
      :rows="rows"
      :sort-items="sortItems"
      :hide-row-label="hideRowLabel"
      :game-header="gameHeader"
      :game-instruction="gameInstruction"
      :pool-header="poolHeader"
      :community-header="communityHeader"
      :worst-header="worstHeader"
      :share-text="shareText"
      :worst-points="worstPoints"
      :worst-show="worstShow"
      :hide-info-button="hideInfoButton"
      @submit="handleSubmit"
    />
    <PyramidCombined
      v-else
      :game-id="gameId"
      :pyramid="pyramid"
      :worst-item="worstItem"
      :items="items"
      :community-items="communityItems"
      :rows="rows"
      :game-header="gameHeader"
      :worst-header="worstHeader"
      :game-title="gameTitle"
      :share-image-title="shareImageTitle"
      :share-text="shareText"
      :share-link="shareLink"
      :hide-row-label="hideRowLabel"
      :worst-points="worstPoints"
      :worst-show="worstShow"
      :stats-reveal-date="statsRevealDate"
    />

    <GameAdOverlay
      v-if="showAd"
      :ad-client="gameData?.adConfig?.adClient"
      :ad-slot="gameData?.adConfig?.adSlot"
      @continue="handleAdContinue"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';
import { getGame } from '@/services/game';
import PyramidEdit from '@/components/games/pyramid/PyramidEdit.vue';
import PyramidCombined from '@/components/games/pyramid/PyramidCombined.vue';
import GameAdOverlay from '@/components/games/common/GameAdOverlay.vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption, PyramidConfig } from '@top-x/shared/types/pyramid';
import { logEvent } from 'firebase/analytics';
import { analytics, db } from '@top-x/shared';
import { doc, getDoc } from 'firebase/firestore';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

useHead({
  title: "TOP-X: Viral Challenges, Rankings & Games on X | Who's on Top?",
  meta: [
    { name: 'description', content: "Join TOP-X for exciting viral challenges, pyramid rankings, trivia games, and competitions on X. Build your top lists, challenge friends, and rise to the challenge! 99% Grok-powered. Who's on top? 🎯" },
  ],
});
const gameId = ref((route.query.game as string));const gameTitle = ref('');
const gameDescription = ref('');
const items = ref<PyramidItem[]>([]);
const communityItems = ref<PyramidItem[]>([]);
const rows = ref<PyramidRow[]>([]);
const sortItems = ref<SortOption>({ orderBy: 'id', order: 'asc' });
const hideRowLabel = ref(false);
const gameHeader = ref('Your Pyramid');
const gameInstruction = ref('');
const poolHeader = ref('Item Pool');
const worstHeader = ref('Worst Item');
const shareText = ref('');
const baseShareText = ref('');
const worstPoints = ref(0);
const worstShow = ref(true);
const hideInfoButton = ref(false);
const shareImageTitle = ref('');
const shareLink = ref('');
const communityHeader = ref('');
const statsRevealDate = ref<string | undefined>(undefined);
const hasSubmitted = ref(false);
const showAd = ref(false);
const gameData = ref<any>(null);
const pendingSubmission = ref<PyramidData | null>(null);
const pyramid = ref<PyramidSlot[][]>([
  [{ image: null }],
  [{ image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }, { image: null }],
]);
const worstItem = ref<PyramidItem | null>(null);

function updateShareText() {
  let text = baseShareText.value || '';
  const firstLabel = pyramid.value[0]?.find(s => s.image)?.image?.label || '';
  const worstLabel = worstItem.value?.label || '';
  if (firstLabel) {
    text = text.replace('*first*', firstLabel);
  }
  if (worstLabel) {
    text = text.replace('*last*', worstLabel);
  }
  shareText.value = text;
}

watch([pyramid, worstItem, baseShareText], updateShareText);

// Computed property to determine if PyramidEdit should be shown
const showEdit = computed(() => route.query.edit === 'true' || !hasSubmitted.value);

onMounted(async () => {
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value, view_type: showEdit.value ? 'edit' : 'nav' });
  }
  console.log('PyramidTier: onMounted called with gameId:', gameId.value);
  if (!gameId.value) {
    console.error('PyramidTier: No gameId provided');
    return;
  }

  try {
    const gameResult = await getGame(gameId.value);

    if (!gameResult.game) {
      console.error('PyramidTier: Game not found');
      return;
    }

    const gameDataRes = gameResult.game;
    gameData.value = gameDataRes;
    
    // Check if game is active - if not, redirect home (game is not playable)
    if (!gameDataRes.active) {
      console.error('PyramidTier: Game is not active, redirecting home');
      router.push('/');
      return;
    }
      gameTitle.value = gameDataRes.name || '';
      gameDescription.value = gameDataRes.description || '';
      gameHeader.value = gameDataRes.gameHeader || 'Your Pyramid';
      gameInstruction.value = gameDataRes.gameInstruction || '';
      const pyramidConfig = gameDataRes.custom as PyramidConfig;
      poolHeader.value = pyramidConfig?.poolHeader || 'Item Pool';
      communityHeader.value = pyramidConfig?.communityHeader || '';
      worstHeader.value = pyramidConfig?.worstHeader || 'Worst Item';
      baseShareText.value = gameDataRes.shareText || '';
      updateShareText();
      shareImageTitle.value = pyramidConfig?.shareImageTitle || '';
      shareLink.value = gameDataRes.shareLink || '';
      items.value = pyramidConfig?.items || [];
      communityItems.value = pyramidConfig?.communityItems || [];
      rows.value = pyramidConfig?.rows || [];
      sortItems.value = pyramidConfig?.sortItems || { orderBy: 'id', order: 'asc' };
      hideRowLabel.value = pyramidConfig?.HideRowLabel ?? false;
      worstPoints.value = pyramidConfig?.worstPoints ?? 0;
      worstShow.value = pyramidConfig?.worstShow !== false;
      hideInfoButton.value = pyramidConfig?.hideInfoButton ?? false;
      statsRevealDate.value = pyramidConfig?.statsRevealDate;

      console.log('PyramidTier: Game data fetched:', {
        gameTitle: gameTitle.value,
        gameDescription: gameDescription.value,
        gameHeader: gameHeader.value,
        gameInstruction: gameInstruction.value,
        poolHeader: poolHeader.value,
        communityHeader: communityHeader.value,
        worstHeader: worstHeader.value,
        shareText: shareText.value,
        shareImageTitle: shareImageTitle.value,
        shareLink: shareLink.value,
        items: items.value,
        communityItems: communityItems.value,
        rows: rows.value,
        sortItems: sortItems.value,
        hideRowLabel: hideRowLabel.value,
        worstPoints: worstPoints.value,
        worstShow: worstShow.value,
        hideInfoButton: hideInfoButton.value
      });

    // Load pyramid state based on user login status
    if (userStore.user) {
      const userDocRef = doc(db, 'users', userStore.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const gameData = userData.games?.PyramidTier?.[gameId.value];
        if (gameData?.custom) {
          pyramid.value = gameData.custom.pyramid.map((tier: any) =>
            tier.slots.map((itemId: string | null) => ({
              image: itemId ? [...items.value, ...communityItems.value].find(item => item.id === itemId) || null : null,
            }))
          );
          worstItem.value = gameData.custom.worstItem
            ? [...items.value, ...communityItems.value].find(item => item.id === gameData.custom.worstItem.id) || null
            : null;
          hasSubmitted.value = true;
          console.log('PyramidTier: Loaded user pyramid data:', { pyramid: pyramid.value, worstItem: worstItem.value });
        }
      }
    } else {
      const savedPyramid = localStorage.getItem(`pyramid_${gameId.value}`);
      if (savedPyramid) {
        const parsed = JSON.parse(savedPyramid);
        pyramid.value = parsed.pyramid;
        worstItem.value = parsed.worstItem;
        hasSubmitted.value = true;
        console.log('PyramidTier: Loaded pyramid from local storage:', parsed);
      }
    }
  } catch (error: any) {
    console.error('PyramidTier: Error fetching game data:', error.message, error);
  }
});

async function handleSubmit(data: PyramidData) {
  console.log('PyramidTier: handleSubmit called with data:', data);

  // Ad is now handled in PyramidCombined component, so skip PyramidTier's ad logic
  // if (gameData.value?.adConfig?.strategy === 'before_end') {
  //   console.log('[PyramidTier] Triggering ad before submission');
  //   pendingSubmission.value = data;
  //   showAd.value = true;
  // } else {
    await finishSubmit(data);
  // }
}

function handleAdContinue() {
  console.log('[PyramidTier] Continuing from ad');
  showAd.value = false;
  if (pendingSubmission.value) {
    void finishSubmit(pendingSubmission.value);
    pendingSubmission.value = null;
  }
}

async function finishSubmit(data: PyramidData) {
  console.log('PyramidTier: finishSubmit called, current hasSubmitted:', hasSubmitted.value);
  pyramid.value = data.pyramid;
  worstItem.value = data.worstItem;

  if (!gameId.value) {
    console.error('PyramidTier: No gameId provided, cannot submit');
    alert('Error: No game ID provided. Please select a game.');
    router.push('/games');
    return;
  }

  const score = calculateScore(data.pyramid, data.worstItem);
  console.log('PyramidTier: Calculated score:', score);

  if (!userStore.user) {
    console.log('PyramidTier: User not logged in, storing vote in localStorage');
    localStorage.setItem(`pyramid_${gameId.value}`, JSON.stringify({
      pyramid: data.pyramid,
      worstItem: data.worstItem,
    }));
    localStorage.setItem(`showLoginPopup_${gameId.value}`, 'true');
    hasSubmitted.value = true;
    console.log('PyramidTier: Set hasSubmitted to true (guest), navigating...');
    router.push({ name: 'PyramidTier', query: { game: gameId.value } });
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

  try {
    await userStore.updateGameProgress(gameTypeId, gameId.value, { score, streak: 0, custom });
    console.log('PyramidTier: User progress updated successfully');
    hasSubmitted.value = true;
    console.log('PyramidTier: Set hasSubmitted to true (logged in), navigating...');
    router.push({ name: 'PyramidTier', query: { game: gameId.value } });
  } catch (err: any) {
    console.error('PyramidTier: Error in finishSubmit:', err.message, err);
    alert('Failed to submit game data. Please try again.');
    // Reset isSubmitting in PyramidEdit if submission failed
    // Note: Since PyramidEdit gets unmounted on navigation, this won't help,
    // but if there's an error, the user can try again
  }
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'submit_vote', game_id: gameId.value, score });
  }
}

function calculateScore(pyramid: PyramidSlot[][], worstItem: PyramidItem | null): number {
  let score = 0;
  pyramid.forEach((row, rowIndex) => {
    const rowPoints = rows.value[rowIndex]?.points || 0;
    row.forEach(slot => {
      if (slot.image) {
        score += rowPoints;
      }
    });
  });
  if (worstItem) {
    score += worstPoints.value;
  }
  console.log('PyramidTier: Calculated score:', score);
  return score;
}
</script>

<style scoped>
.pyramid-tier {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

@media screen and (max-width: 767px) {
  .pyramid-tier {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
}
</style>
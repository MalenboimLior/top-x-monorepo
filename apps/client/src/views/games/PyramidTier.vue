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
      @submit="handleSubmit"
    />
    <PyramidNav
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
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import PyramidEdit from '@/components/PyramidEdit.vue';
import PyramidNav from '@/components/PyramidNav.vue';
import { useUserStore } from '@/stores/user';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

useHead({
  title: "TOP-X: Viral Challenges, Rankings & Games on X | Who's on Top?",
  meta: [
    { name: 'description', content: "Join TOP-X for exciting viral challenges, pyramid rankings, trivia games, and competitions on X. Build your top lists, challenge friends, and rise to the challenge! 99% Grok-powered. Who's on top? 🎯" },
  ],
});
const gameId = ref((route.query.game as string).toLowerCase());const gameTitle = ref('');
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
const shareImageTitle = ref('');
const shareLink = ref('');
const communityHeader = ref('');
const hasSubmitted = ref(false);
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
  console.log('PyramidTier: onMounted called with gameId:', gameId.value);
  if (!gameId.value) {
    console.error('PyramidTier: No gameId provided');
    return;
  }

  try {
    const gameDocRef = doc(db, 'games', gameId.value);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const gameData = gameDoc.data();
      gameTitle.value = gameData.name || '';
      gameDescription.value = gameData.description || '';
      gameHeader.value = gameData.gameHeader || 'Your Pyramid';
      gameInstruction.value = gameData.gameInstruction || '';
      poolHeader.value = gameData.custom?.poolHeader || 'Item Pool';
      communityHeader.value = gameData.custom?.communityHeader || '';
      worstHeader.value = gameData.custom?.worstHeader || 'Worst Item';
      baseShareText.value = gameData.shareText || '';
      updateShareText();
      shareImageTitle.value = gameData.custom?.shareImageTitle || '';
      shareLink.value = gameData.shareLink || '';
      items.value = gameData.custom?.items || [];
      communityItems.value = gameData.custom?.communityItems || [];
      rows.value = gameData.custom?.rows || [];
      sortItems.value = gameData.custom?.sortItems || { orderBy: 'id', order: 'asc' };
      hideRowLabel.value = gameData.custom?.HideRowLabel ?? false;
      worstPoints.value = gameData.custom?.worstPoints ?? 0;
      worstShow.value = gameData.custom?.worstShow !== false;

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
        worstShow: worstShow.value
      });
    } else {
      console.error('PyramidTier: Game document not found for ID:', gameId.value);
    }

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
  pyramid.value = data.pyramid;
  worstItem.value = data.worstItem;

  if (!gameId.value) {
    console.error('PyramidTier: No gameId provided, cannot submit');
    alert('Error: No game ID provided. Please select a game.');
    router.push('/games');
    return;
  }

  const score = calculateScore(data.pyramid, data.worstItem);

  if (!userStore.user) {
    console.log('PyramidTier: User not logged in, storing vote in localStorage');
    localStorage.setItem(`pyramid_${gameId.value}`, JSON.stringify({
      pyramid: data.pyramid,
      worstItem: data.worstItem,
    }));
    localStorage.setItem(`showLoginPopup_${gameId.value}`, 'true');
    hasSubmitted.value = true;
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
    await userStore.updateGameProgress(gameTypeId, gameId.value, { score, streak: 0, lastPlayed: new Date().toISOString(), custom });
    console.log('PyramidTier: User progress updated successfully');
    hasSubmitted.value = true;
    router.push({ name: 'PyramidTier', query: { game: gameId.value } });
  } catch (err: any) {
    console.error('PyramidTier: Error in handleSubmit:', err.message, err);
    alert('Failed to submit game data. Please try again.');
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
/*.pyramid-tier {
  padding: 20px;
}*/
</style>
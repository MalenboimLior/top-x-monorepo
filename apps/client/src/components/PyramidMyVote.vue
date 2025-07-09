<template>
  <div class="pyramid-my-vote">
    <div :key="renderKey">
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
        :hide-row-label="hideRowLabel"
        :worst-show="worstShow"
        :user-profile="{ photoURL: userStore.user?.photoURL || '' }"
      />
    </div>
    <div class="buttons is-centered mt-4">
      <CustomButton
        type="is-primary"
        label="Edit"
        :icon="['fas', 'edit']"
        @click="editPyramid"
      />
      <ShareButton
        :share-text="shareText || 'Check out my TOP-X Pyramid ranking! #TOPX'"
        :image-url="imageUrl"
      />
    </div>
    <PyramidLoginPopup
      :is-active="showLoginPopup"
      :game-id="props.gameId"
      :rows="rows"
      @login="closeLoginPopup"
      @skip="closeLoginPopup"
      @close="closeLoginPopup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import PyramidImage from '@/components/PyramidImage.vue';
import PyramidLoginPopup from '@/components/PyramidLoginPopup.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ShareButton from '@/components/ShareButton.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';

const router = useRouter();
const userStore = useUserStore();
const pyramidImageRef = ref<any>(null);
const imageUrl = computed(() => pyramidImageRef.value?.getImageDataUrl() || null);
const showLoginPopup = ref(false);
const renderKey = ref(0);

const props = defineProps<{
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  rows: PyramidRow[];
  gameId?: string;
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  worstPoints?: number;
  shareImageTitle?: string;
  shareText?: string;
  worstShow?: boolean;
}>();

onMounted(() => {
  console.log('PyramidMyVote: onMounted called with gameId:', props.gameId);
  if (!userStore.user && props.gameId) {
    const flag = localStorage.getItem(`showLoginPopup_${props.gameId}`);
    if (flag) {
      showLoginPopup.value = true;
      localStorage.removeItem(`showLoginPopup_${props.gameId}`);
      console.log('PyramidMyVote: Showing login popup due to flag');
    }
  }
});

// Removed watch for userStore.user to avoid redundant saveCachedVote
watch(
  () => userStore.user,
  (newUser) => {
    if (newUser && props.gameId) {
      console.log('PyramidMyVote: User logged in, triggering re-render');
      renderKey.value++; // Force re-render of PyramidImage
      console.log('PyramidMyVote: Forcing re-render with new renderKey:', renderKey.value);
    }
  }
);

function closeLoginPopup() {
  console.log('PyramidMyVote: Closing login popup');
  showLoginPopup.value = false;
  renderKey.value++; // Force re-render to update PyramidImage
}

function editPyramid() {
  if (props.gameId) {
    router.push({ name: 'PyramidTier', query: { game: props.gameId, edit: 'true' } });
    console.log('PyramidMyVote: Navigating to PyramidEdit with edit=true');
  }
}
</script>

<style scoped>
.pyramid-my-vote {
  padding: 0.2rem 0.1rem;
  background-color: #000000;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.subtitle {
  color: #eee;
  font-size: 1rem;
  margin: 0.3rem 0;
}

@media screen and (max-width: 767px) {
  .pyramid-my-vote {
    padding: 0.1rem 0.05rem;
  }
}
</style>
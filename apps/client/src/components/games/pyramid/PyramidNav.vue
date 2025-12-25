<template>
  <div class="pyramid-nav">
    <div class="tabs-container">
      <ul class="tabs-list">
        <li class="tab-item" :class="{ 'is-active': activeTab === 'results' }">
          <a class="tab-link" @click="setActiveTab('results')">📊 Results</a>
        </li>
        <li class="tab-item" :class="{ 'is-active': activeTab === 'peer-picks' }">
          <a class="tab-link" @click="setActiveTab('peer-picks')">👥 Peer Picks</a>
        </li>
      </ul>
    </div>
    <div class="tab-content">
      <PyramidCombined
        v-if="activeTab === 'results'"
        :game-id="gameId"
        :pyramid="pyramid"
        :worst-item="worstItem"
        :items="items || []"
        :community-items="communityItems || []"
        :rows="rows || []"
        :game-header="gameHeader"
        :worst-header="worstHeader"
        :game-title="gameTitle"
        :share-image-title="shareImageTitle"
        :share-text="shareText"
        :share-link="shareLink"
        :hide-row-label="hideRowLabel"
        :worst-show="worstShow"
        :worstPoints="worstPoints || 0"
        :stats-reveal-date="statsRevealDate"
      />
      <PyramidResults
        v-if="activeTab === 'peer-picks'"
         :game-id="gameId"
        :items="items || []"
        :community-items="communityItems || []"
        :rows="rows || []"
        :game-header="gameHeader"
        :share-image-title="shareImageTitle"
        :worst-header="worstHeader"
        :game-title="gameTitle"
        :hide-row-label="hideRowLabel"
        :worst-show="worstShow"
        :share-link="shareLink"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PyramidCombined from '@/components/games/pyramid/PyramidCombined.vue';
import PyramidResults from '@/components/games/pyramid/PyramidResults.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';

const route = useRoute();
const router = useRouter();

const props = defineProps<{
  gameId: string;
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  items?: PyramidItem[];
  communityItems?: PyramidItem[];
  rows?: PyramidRow[];
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

const activeTab = ref<'results' | 'peer-picks'>('results');

onMounted(() => {
  const hash = route.hash.replace('#', '');
  if (hash === 'peer-picks') {
    activeTab.value = 'peer-picks';
  } else {
     activeTab.value = 'results';
  }
  console.log('PyramidNav: onMounted, active tab:', activeTab.value);
});

function setActiveTab(tab: 'results' | 'peer-picks') {
  activeTab.value = tab;
  // preserve existing query params when updating the hash
  router.replace({
    hash: `#${tab}`,
    query: { ...route.query },
  });
  console.log('PyramidNav: Set active tab to:', tab);
}
</script>

<style scoped>
.pyramid-nav {
  /* background-color: #000000; Remove hard black to allow parent bg to shine if needed, or keep if part of design system */
  color: white;
  padding: 1rem 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.tabs-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  width: 100%;
}

.tabs-list {
  display: flex;
  gap: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 0.5rem;
  border-radius: 50px; /* Pill shape container */
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-item {
  list-style: none;
}

.tab-link {
  display: block;
  padding: 0.75rem 1.5rem;
  border-radius: 40px; /* Pill shape items */
  color: #aaa;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.tab-link:hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.05);
}

.tab-item.is-active .tab-link {
  background: linear-gradient(135deg, #00e8e0 0%, #00b8b0 100%);
  color: #000;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.4);
  border-color: #00e8e0;
}

.tab-content {
  width: 100%;
  max-width: 100%;
  min-height: 300px;
  animation: fadeIn 0.5s ease-out;
  margin: 0 auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media screen and (max-width: 767px) {
  .pyramid-nav {
    padding: 0.5rem 0;
    width: 100%;
  }
  .tabs-list {
    gap: 0.5rem;
    padding: 0.3rem;
  }
  .tab-link {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
  .tab-content {
    width: 100%;
    max-width: 100%;
    padding: 0;
    margin: 0;
  }
}
</style>
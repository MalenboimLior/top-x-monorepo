<template>
  <div class="pyramid-nav">
    <div class="tabs is-centered is-boxed">
      <ul>
        <li :class="{ 'is-active': activeTab === 'my-vote' }">
          <a @click="activeTab = 'my-vote'">My Vote</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'stats' }">
          <a @click="activeTab = 'stats'">Statistics</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'results' }">
          <a @click="activeTab = 'results'">Other Votes</a>
        </li>
      </ul>
    </div>
    <div class="tab-content">
      <PyramidMyVote
        v-if="activeTab === 'my-vote'"
        :pyramid="pyramid"
        :worst-item="worstItem"
        :rows="rows ?? []"
        :game-header="gameHeader"
        :worst-header="worstHeader"
        :game-title="gameTitle"
        :hide-row-label="hideRowLabel"
        :game-id="gameId"
      />
      <PyramidStats
        v-if="activeTab === 'stats'"
        :game-id="gameId"
        :items="items ?? []"
        :rows="rows ?? []"
        :worstPoints="worstPoints ?? 0"
        :game-header="gameHeader"

      />
      <PyramidResults
        v-if="activeTab === 'results'"
        :game-id="gameId"
        :items="items ?? []"
        :rows="rows ?? []"
        :game-header="gameHeader"
        :worst-header="worstHeader"
        :game-title="gameTitle"
        :hide-row-label="hideRowLabel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PyramidMyVote from '@/components/PyramidMyVote.vue';
import PyramidStats from '@/components/PyramidStats.vue';
import PyramidResults from '@/components/PyramidResults.vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  gameId: string;
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  items?: PyramidItem[];
  rows?: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  worstPoints?: number;
}>();

const activeTab = ref<'my-vote' | 'stats' | 'results'>('my-vote');

onMounted(() => {
  console.log('PyramidNav: onMounted, default tab:', activeTab.value);
});
</script>

<style scoped>
.pyramid-nav {
  background-color: #121212;
  color: white;
  padding: 0.2rem 0.1rem;
}
.tabs {
  margin-bottom: 1rem;
}
.tabs ul {
  border-bottom: none;
}
.tabs li {
  background-color: #1f1f1f;
}
.tabs li.is-active a {
  background-color: #3273dc;
  color: white;
  border-color: #3273dc;
}
.tabs a {
  color: #eee;
  border: 1px solid #444;
}
.tab-content {
  min-height: 300px;
}
@media screen and (max-width: 767px) {
  .pyramid-nav {
    padding: 0.1rem 0.05rem;
  }
  .tabs a {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
}
</style>
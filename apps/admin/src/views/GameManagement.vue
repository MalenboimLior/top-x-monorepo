<template>
  <div class="container">
    <h1 class="title has-text-white">Game Management</h1>
    <div class="tabs is-boxed">
      <ul>
        <li :class="{ 'is-active': activeTab === 'gameTypes' }">
          <a @click="switchTab('gameTypes')">Game Types</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'games' }">
          <a @click="switchTab('games')">Games</a>
        </li>
        <li v-if="shouldRenderRowList" :class="{ 'is-active': activeTab === 'rows' }">
          <a @click="switchTab('rows')">Rows</a>
        </li>
        <li v-if="shouldRenderItemList" :class="{ 'is-active': activeTab === 'items' }">
          <a @click="switchTab('items')">Items/Questions</a>
        </li>
        <li v-if="shouldRenderCommunityItemList" :class="{ 'is-active': activeTab === 'community' }">
          <a @click="switchTab('community')">Community Items</a>
        </li>
      </ul>
    </div>

    <GameTypeList v-if="activeTab === 'gameTypes'" @select="selectGameType" @edit="editGameType" />
    <GameTypeRecord v-if="editingGameType" :gameType="editingGameType" @save="saveGameType" @cancel="cancelEdit" />
    <GameList
      v-if="activeTab === 'games'"
      :selectedGameTypeId="selectedGameTypeId"
      @select="selectGame"
      @edit="editGame"
      @mounted="logGameListMounted"
    />
    <GameRecord
      v-if="editingGame"
      :game="editingGame"
      :gameTypeId="selectedGameTypeId"
      @save="saveGame"
      @cancel="cancelEdit"
    />
    <PyramidRowList
      v-if="shouldRenderRowList"
      ref="pyramidRowList"
      :gameId="selectedGameId"
      @edit="editRow"
      @refresh="refreshRows"
    />
    <PyramidRowRecord
      v-if="editingRow && gameTypeCustom === 'PyramidConfig'"
      :row="editingRow"
      :gameId="selectedGameId"
      @save="saveRow"
      @cancel="cancelEdit"
      @refresh="refreshRows"
    />
    <PyramidItemList
      v-if="activeTab === 'items' && gameTypeCustom === 'PyramidConfig' && selectedGameId"
      ref="pyramidItemList"
      :gameId="selectedGameId"
      @edit="editItem"
      @refresh="refreshItems"
    />
    <PyramidItemRecord
      v-if="editingItem && gameTypeCustom === 'PyramidConfig'"
      :item="editingItem"
      :gameId="selectedGameId"
      @save="saveItem"
      @cancel="cancelEdit"
      @refresh="refreshItems"
    />
    <CommunityItemList
      v-if="activeTab === 'community' && gameTypeCustom === 'PyramidConfig' && selectedGameId"
      ref="communityItemList"
      :gameId="selectedGameId"
    />
    <QuestionList
      v-if="activeTab === 'items' && gameTypeCustom === 'TriviaConfig' && selectedGameId"
      :gameId="selectedGameId"
      @edit="editQuestion"
    />
    <QuestionRecord
      v-if="editingQuestion && gameTypeCustom === 'TriviaConfig'"
      :question="editingQuestion"
      gameId="selectedGameId"
      @save="saveQuestion"
      @cancel="cancelEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import GameTypeList from '@/components/GameTypeList.vue';
import GameTypeRecord from '@/components/GameTypeRecord.vue';
import GameList from '@/components/GameList.vue';
import GameRecord from '@/components/GameRecord.vue';
import PyramidRowList from '@/components/PyramidRowList.vue';
import PyramidRowRecord from '@/components/PyramidRowRecord.vue';
import PyramidItemList from '@/components/PyramidItemList.vue';
import PyramidItemRecord from '@/components/PyramidItemRecord.vue';
import CommunityItemList from '@/components/CommunityItemList.vue';
import QuestionList from '@/components/QuestionList.vue';
import QuestionRecord from '@/components/QuestionRecord.vue';
import type { GameType, Game, ConfigType } from '@top-x/shared/types/game';
import type { PyramidItem, PyramidRow } from '@top-x/shared/types/pyramid';
import type { TriviaQuestion } from '@top-x/shared/types';

const activeTab = ref<'gameTypes' | 'games' | 'rows' | 'items' | 'community'>('gameTypes');
const selectedGameTypeId = ref<string | null>(null);
const selectedGameId = ref<string | null>(null);
const gameTypeCustom = ref<ConfigType | null>(null);
const editingGameType = ref<GameType | null>(null);
const editingGame = ref<Game | null>(null);
const editingRow = ref<PyramidRow | null>(null);
const editingItem = ref<PyramidItem | null>(null);
const editingQuestion = ref<TriviaQuestion | null>(null);
const pyramidRowList = ref<InstanceType<typeof PyramidRowList> | null>(null);
const pyramidItemList = ref<InstanceType<typeof PyramidItemList> | null>(null);
const communityItemList = ref<InstanceType<typeof CommunityItemList> | null>(null);

const shouldRenderRowList = computed(() => {
  const render = selectedGameTypeId.value && selectedGameId.value && gameTypeCustom.value === 'PyramidConfig';
  console.log('shouldRenderRowList evaluated:', { render, activeTab: activeTab.value, selectedGameTypeId: selectedGameTypeId.value, selectedGameId: selectedGameId.value, gameTypeCustom: gameTypeCustom.value });
  return render;
});

const shouldRenderItemList = computed(() => {
  const render = selectedGameTypeId.value && selectedGameId.value && gameTypeCustom.value === 'PyramidConfig';
  console.log('shouldRenderItemList evaluated:', { render, activeTab: activeTab.value, selectedGameTypeId: selectedGameTypeId.value, selectedGameId: selectedGameId.value, gameTypeCustom: gameTypeCustom.value });
  return render;
});

const shouldRenderCommunityItemList = computed(() => {
  const render = selectedGameTypeId.value && selectedGameId.value && gameTypeCustom.value === 'PyramidConfig';
  return render;
});

const switchTab = (tab: typeof activeTab.value) => {
  console.log('switchTab called:', { tab, currentTab: activeTab.value, selectedGameId: selectedGameId.value, gameTypeCustom: gameTypeCustom.value });
  activeTab.value = tab;
  if (tab === 'items' && pyramidItemList.value && selectedGameId.value) {
    console.log('Forcing PyramidItemList refresh on items tab switch');
    pyramidItemList.value.refresh();
  }
  if (tab === 'community' && communityItemList.value && selectedGameId.value) {
    communityItemList.value.refresh();
  }
};

const selectGameType = async (gameTypeId: string) => {
  console.log('Selecting GameType:', gameTypeId);
  selectedGameTypeId.value = gameTypeId;
  selectedGameId.value = null;
  activeTab.value = 'games';
  console.log('selectGameType updated state:', { selectedGameTypeId: selectedGameTypeId.value, selectedGameId: selectedGameId.value, activeTab: activeTab.value });
  try {
    const gameTypeDoc = await getDoc(doc(db, 'gameTypes', gameTypeId));
    if (gameTypeDoc.exists()) {
      gameTypeCustom.value = gameTypeDoc.data().custom as ConfigType;
      console.log('GameType custom fetched:', gameTypeCustom.value);
    } else {
      console.log('GameType not found:', gameTypeId);
      gameTypeCustom.value = null;
    }
  } catch (err: any) {
    console.error('selectGameType error:', { error: err.message, code: err.code });
    gameTypeCustom.value = null;
  }
};

const selectGame = (gameId: string) => {
  console.log('Selecting Game:', gameId);
  selectedGameId.value = gameId;
  activeTab.value = gameTypeCustom.value === 'PyramidConfig' ? 'items' : 'items';
  console.log('selectGame updated state:', { selectedGameId: selectedGameId.value, activeTab: activeTab.value });
};

const editGameType = (gameType: GameType) => {
  console.log('Editing GameType:', gameType);
  editingGameType.value = { ...gameType };
};

const editGame = (game: Game) => {
  console.log('Editing Game:', game);
  editingGame.value = { ...game };
};

const editRow = (row: PyramidRow) => {
  console.log('Editing Row:', row);
  editingRow.value = { ...row };
};

const editItem = (item: PyramidItem) => {
  console.log('Editing Item:', item);
  editingItem.value = { ...item };
};

const editQuestion = (question: TriviaQuestion) => {
  console.log('Editing Question:', question);
  editingQuestion.value = { ...question };
};

const saveGameType = () => {
  console.log('GameType saved');
  editingGameType.value = null;
};

const saveGame = () => {
  console.log('Game saved');
  editingGame.value = null;
};

const saveRow = () => {
  console.log('Row saved');
  editingRow.value = null;
};

const saveItem = () => {
  console.log('Item saved');
  editingItem.value = null;
};

const saveQuestion = () => {
  console.log('Question saved');
  editingQuestion.value = null;
};

const cancelEdit = () => {
  console.log('Edit cancelled');
  editingGameType.value = null;
  editingGame.value = null;
  editingRow.value = null;
  editingItem.value = null;
  editingQuestion.value = null;
};

const refreshRows = () => {
  console.log('refreshRows called');
  if (pyramidRowList.value) {
    pyramidRowList.value.refresh();
  }
};

const refreshItems = () => {
  console.log('refreshItems called');
  if (pyramidItemList.value && selectedGameId.value) {
    pyramidItemList.value.refresh();
  }
};

const refreshCommunityItems = () => {
  if (communityItemList.value && selectedGameId.value) {
    communityItemList.value.refresh();
  }
};

const logGameListMounted = () => {
  console.log('GameList component mounted with selectedGameTypeId:', selectedGameTypeId.value);
};
</script>

<style scoped>
.container {
  padding: 1rem;
}
</style>
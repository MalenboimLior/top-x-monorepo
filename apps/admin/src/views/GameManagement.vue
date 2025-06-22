<template>
  <div class="container">
    <h1 class="title has-text-white">Game Management</h1>
    <div class="tabs is-boxed">
      <ul>
        <li :class="{ 'is-active': activeTab === 'gameTypes' }">
          <a @click="activeTab = 'gameTypes'">Game Types</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'games' }">
          <a @click="activeTab = 'games'">Games</a>
        </li>
        <li v-if="selectedGameTypeId" :class="{ 'is-active': activeTab === 'items' }">
          <a @click="activeTab = 'items'">Items/Questions</a>
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
    <PyramidItemList
      v-if="activeTab === 'items' && selectedGameTypeId && selectedGameId && gameTypeCustom === 'PyramidConfig'"
      :gameId="selectedGameId"
      @edit="editItem"
    />
    <PyramidItemRecord
      v-if="editingItem && gameTypeCustom === 'PyramidConfig'"
      :item="editingItem"
      :gameId="selectedGameId"
      @save="saveItem"
      @cancel="cancelEdit"
    />
    <QuestionList
      v-if="activeTab === 'items' && selectedGameTypeId && selectedGameId && gameTypeCustom === 'TriviaConfig'"
      :gameId="selectedGameId"
      @edit="editQuestion"
    />
    <QuestionRecord
      v-if="editingQuestion && gameTypeCustom === 'TriviaConfig'"
      :question="editingQuestion"
      :gameId="selectedGameId"
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
import PyramidItemList from '@/components/PyramidItemList.vue';
import PyramidItemRecord from '@/components/PyramidItemRecord.vue';
import QuestionList from '@/components/QuestionList.vue';
import QuestionRecord from '@/components/QuestionRecord.vue';
import type { GameType, Game, ConfigType } from '@top-x/shared/types/game';
import type { PyramidItem } from '@top-x/shared/types/pyramid';
import type { TriviaQuestion } from '@top-x/shared/types';

const activeTab = ref<'gameTypes' | 'games' | 'items'>('gameTypes');
const selectedGameTypeId = ref<string | null>(null);
const selectedGameId = ref<string | null>(null);
const gameTypeCustom = ref<ConfigType | null>(null);
const editingGameType = ref<GameType | null>(null);
const editingGame = ref<Game | null>(null);
const editingItem = ref<PyramidItem | null>(null);
const editingQuestion = ref<TriviaQuestion | null>(null);

const selectGameType = async (gameTypeId: string) => {
  console.log('Selecting GameType:', gameTypeId);
  selectedGameTypeId.value = gameTypeId;
  activeTab.value = 'games';
  console.log('selectGameType updated state:', { selectedGameTypeId: selectedGameTypeId.value, activeTab: activeTab.value });
  const gameTypeDoc = await getDoc(doc(db, 'gameTypes', gameTypeId));
  if (gameTypeDoc.exists()) {
    gameTypeCustom.value = gameTypeDoc.data().custom as ConfigType;
    console.log('GameType custom fetched:', gameTypeCustom.value);
  } else {
    console.log('GameType not found:', gameTypeId);
    gameTypeCustom.value = null;
  }
};

const selectGame = (gameId: string) => {
  console.log('Selecting Game:', gameId);
  selectedGameId.value = gameId;
  activeTab.value = 'items';
};

const editGameType = (gameType: GameType) => {
  console.log('Editing GameType:', gameType);
  editingGameType.value = { ...gameType };
};

const editGame = (game: Game) => {
  console.log('Editing Game:', game);
  editingGame.value = { ...game };
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
  editingItem.value = null;
  editingQuestion.value = null;
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
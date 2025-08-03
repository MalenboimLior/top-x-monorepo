<template>
  <div class="build-page">
    <div v-if="!user">
      <p class="has-text-white">only login users can create new games - please login</p>
      <CustomButton type="is-primary" label="Login" @click="login" />
    </div>
    <div v-else>
      <div v-if="!selectedGameType">
        <h2 class="title has-text-white">Choose Game Type</h2>
        <div class="columns is-multiline">
          <div v-for="gt in gameTypes" :key="gt.id" class="column is-one-third" @click="selectGameType(gt)">
            <Card class="is-clickable">
              <h3 class="title is-5 has-text-white">{{ gt.name }}</h3>
              <p class="has-text-grey-light">{{ gt.description }}</p>
            </Card>
          </div>
        </div>
      </div>
      <div v-else>
        <BuildAddNewGame :gameType="selectedGameType" @saved="onSaved" @cancel="selectedGameType = null" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useUserStore } from '@/stores/user';
import BuildAddNewGame from '@/components/build/BuildAddNewGame.vue';
import type { GameType } from '@top-x/shared/types';

const userStore = useUserStore();
const user = computed(() => userStore.user);

const gameTypes = ref<GameType[]>([]);
const selectedGameType = ref<GameType | null>(null);

async function fetchGameTypes() {
  const q = query(collection(db, 'gameTypes'), where('availableToBuild', '==', true));
  const snapshot = await getDocs(q);
  gameTypes.value = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as GameType[];
}

onMounted(() => {
  if (user.value) fetchGameTypes();
});

watch(user, (val) => {
  if (val) fetchGameTypes();
});

function login() {
  userStore.loginWithX();
}

function selectGameType(gt: GameType) {
  selectedGameType.value = gt;
}

function onSaved() {
  selectedGameType.value = null;
  fetchGameTypes();
}
</script>

<style scoped>
.is-clickable { cursor: pointer; }
</style>

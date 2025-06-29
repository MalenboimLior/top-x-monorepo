<!-- Search for other players to compare ranks -->
<template>
  <div class="frenemy-search-container">
    <h1 class="title has-text-white">Find Frenemies</h1>
    <Card>
      <div class="field has-addons">
        <div class="control is-expanded">
          <input
            v-model="searchQuery"
            class="input"
            type="text"
            placeholder="Search by X username"
            @keyup.enter="searchUsers"
          />
        </div>
        <div class="control">
          <CustomButton
            :type="`is-primary ${isLoading ? 'is-loading' : ''}`"
            :label="isLoading ? 'Searching...' : 'Search'"
            @click="searchUsers"
          />
        </div>
      </div>
      <p v-if="error" class="help is-danger">{{ error }}</p>
    </Card>
    <Leaderboard
      v-if="searchResults.length"
      title="Search Results"
      :entries="searchResults"
      :frenemies="userStore.profile?.frenemies || []"
      :currentUserId="userStore.user?.uid"
      @add-frenemy="addFrenemy"
    />
    <Card v-else-if="hasSearched && searchQuery && !isLoading">
      <p class="has-text-grey-light">No users found for "{{ searchQuery }}".</p>
    </Card>
    <div v-if="!userStore.user" class="notification is-warning">
      Please log in to search and add frenemies.
      <CustomButton type="is-primary" label="Login with " :icon="['fab', 'x-twitter']" @click="userStore.loginWithX" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { ref, watch } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { debounce } from 'lodash';
import Card from '@top-x/shared/components/Card.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { UserProfile } from '@top-x/shared';

const userStore = useUserStore();
const searchQuery = ref('');
const searchResults = ref<UserProfile[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const debouncedSearch = debounce(async () => {
  await searchUsers();
}, 500);

watch(searchQuery, (newValue) => {
  if (newValue.trim()) {
    hasSearched.value = false;
    debouncedSearch();
  } else {
    searchResults.value = [];
    hasSearched.value = false;
    error.value = null;
  }
});

async function searchUsers() {
  if (!userStore.user) {
    error.value = 'Please log in to search for frenemies.';
    hasSearched.value = true;
    return;
  }
  if (!searchQuery.value.trim()) {
    error.value = 'Please enter a username to search.';
    hasSearched.value = true;
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('displayName', '>=', searchQuery.value),
      where('displayName', '<=', searchQuery.value + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    searchResults.value = querySnapshot.docs.map(doc => doc.data() as UserProfile);
    hasSearched.value = true;
  } catch (err: any) {
    if (err.code === 'permission-denied') {
      error.value = 'Permission denied. Please ensure you’re logged in and try again.';
    } else {
      error.value = `Search failed: ${err.message}`;
    }
    hasSearched.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function addFrenemy(uid: string) {
  if (!userStore.user) {
    error.value = 'Please log in to add frenemies.';
    return;
  }
  await userStore.addFrenemy(uid);
  searchResults.value = searchResults.value.filter(user => user.uid !== uid);
}
</script>

<style scoped>
@import '../styles/FrenemySearch.css';
</style>

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
            placeholder="Search by username or name"
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
    <div v-if="searchResults.length">
      <div v-for="entry in searchResults" :key="entry.uid" class="media mt-3">
        <div class="media-left">
          <figure class="image is-48x48">
            <img :src="entry.photoURL" alt="Profile picture" class="is-rounded" />
          </figure>
        </div>
        <div class="media-content">
          <p class="title is-5 has-text-white">
            <RouterLink :to="{ path: '/profile', query: { user: entry.uid } }">{{ entry.displayName }}</RouterLink>
          </p>
          <p class="subtitle is-6 has-text-grey-light">{{ entry.username }}</p>
        </div>
        <div class="media-right">
          <CustomButton
            v-if="!isFrenemy(entry.uid)"
            type="is-primary is-small"
            label="Add Frenemy"
            @click="addFrenemy(entry.uid)"
          />
          <p v-else class="has-text-grey-light">Already Frenemies</p>
        </div>
      </div>
    </div>
    <Card v-else-if="hasSearched && searchQuery && !isLoading">
      <p class="has-text-grey-light">No users found for "{{ searchQuery }}".</p>
    </Card>
    <div v-if="!userStore.user" class="notification is-warning">
      Please log in to search and add frenemies.
      <CustomButton type="is-primary" label="Login with X" :icon="['fab', 'x-twitter']" @click="userStore.loginWithX" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { ref, watch, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import { RouterLink } from 'vue-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { debounce } from 'lodash';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { User } from '@top-x/shared/types/user';

const userStore = useUserStore();
const router = useRouter();

useHead({
  title: 'Find Frenemies - TOP-X',
  meta: [
    { name: 'description', content: 'Search for friends or rivals and add frenemies on TOP-X.' },
  ],
});
const searchQuery = ref('');
const searchResults = ref<User[]>([]);
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
  let queryStr = searchQuery.value.trim();
  if (!queryStr) {
    error.value = 'Please enter a username or name to search.';
    hasSearched.value = true;
    return;
  }
  if (queryStr.startsWith('@')) {
    queryStr = queryStr.slice(1);
  }
  isLoading.value = true;
  error.value = null;
  try {
    const usersRef = collection(db, 'users');
    const displayQ = query(
      usersRef,
      where('displayName', '>=', queryStr),
      where('displayName', '<=', queryStr + '\uf8ff')
    );
    const usernameQ = query(
      usersRef,
      where('username', '>=', queryStr),
      where('username', '<=', queryStr + '\uf8ff')
    );
    const [displaySnap, usernameSnap] = await Promise.all([getDocs(displayQ), getDocs(usernameQ)]);
    const resultsMap = new Map<string, User>();
    displaySnap.docs.forEach(doc => {
      resultsMap.set(doc.id, doc.data() as User);
    });
    usernameSnap.docs.forEach(doc => {
      if (!resultsMap.has(doc.id)) {
        resultsMap.set(doc.id, doc.data() as User);
      }
    });
    searchResults.value = Array.from(resultsMap.values()).map(user => ({
      ...user,
      username: user.username ? `@${user.username}` : '@Anonymous',
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || 'https://www.top-x.co/assets/profile.png',
    }));
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

const isFrenemy = (uid: string) => {
  return userStore.profile?.frenemies?.includes(uid) || false;
};

async function addFrenemy(uid: string) {
  if (!userStore.user) {
    error.value = 'Please log in to add frenemies.';
    return;
  }
  await userStore.addFrenemy(uid);
  searchResults.value = searchResults.value.filter(result => result.uid !== uid);
}
</script>

<style scoped>
@import '../styles/FrenemySearch.css';
</style>

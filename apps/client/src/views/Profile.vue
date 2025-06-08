<template>
  <div class="profile-container">
    <h1 class="title has-text-white">Your Profile</h1>
    <div v-if="isLoggedIn">
      <Card>
        <div class="media">
          <div class="media-left">
            <figure class="image is-64x64">
              <img :src="photoURL" alt="Profile picture" class="is-rounded" />
            </figure>
          </div>
          <div class="media-content">
            <p class="title is-4 has-text-white">{{ displayName }}</p>
            <p class="subtitle is-6 has-text-grey-light">{{ userStore.profile?.username }}</p>
          </div>
        </div>
        <div class="content mt-4">
          <h3 class="subtitle is-5 has-text-white">Trivia Stats</h3>
          <p class="has-text-white">Best Score: {{ triviaStats.score }}</p>
          <p class="has-text-white">Best Streak: {{ triviaStats.streak }}</p>
        </div>
      </Card>
      <Leaderboard
        title="Your Rivals"
        :entries="rivals"
        :rivals="userStore.profile?.rivals || []"
        :currentUserId="userStore.user?.uid"
        @add-rival="addRival"
      >
        <template v-if="!rivals.length">
          <p class="has-text-grey-light">No rivals added yet.</p>
        </template>
      </Leaderboard>
      <Leaderboard
        title="Rivals Who’ve Added You"
        :entries="addedBy"
        :rivals="userStore.profile?.rivals || []"
        :currentUserId="userStore.user?.uid"
        @add-rival="addRival"
      >
        <template v-if="!addedBy.length">
          <p class="has-text-grey-light">No one has added you as a rival yet.</p>
        </template>
      </Leaderboard>
    </div>
    <div v-else class="notification is-warning">
      Please log in to view your profile.
      <CustomButton type="is-primary" label="Login with " :icon="['fab', 'x-twitter']" @click="userStore.loginWithX" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { computed, ref } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import Card from '@top-x/shared/components/Card.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { User } from '@top-x/shared/types/user';

const userStore = useUserStore();

const displayName = computed(() => userStore.profile?.displayName || 'Anonymous');
const photoURL = computed(() => userStore.profile?.photoURL || 'https://www.top-x.co/asstes/profile.png');
const triviaStats = computed(() => userStore.profile?.games?.trivia || { score: 0, streak: 0 });
const isLoggedIn = computed(() => !!userStore.user);
const rivals = ref<User[]>([]);
const addedBy = ref<User[]>([]);

async function fetchRivals() {
  if (!userStore.profile?.rivals) return;
  rivals.value = [];
  for (const uid of userStore.profile.rivals) {
    const userDoc = doc(db, 'users', uid);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      const userData = docSnap.data() as User;
      // Push userData and handle score separately if needed
      rivals.value.push(userData);
    }
  }
}

async function fetchAddedBy() {
  if (!userStore.profile?.addedBy) return;
  addedBy.value = [];
  for (const uid of userStore.profile.addedBy) {
    const userDoc = doc(db, 'users', uid);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      const userData = docSnap.data() as User;
      // Ensure score property exists for LeaderboardEntry
    if (docSnap.exists()) {
      const userData = docSnap.data() as User;
      // Push userData and handle score separately if needed
      addedBy.value.push(userData);
    }
async function addRival(uid: string) {
  await userStore.addRival(uid);
  await fetchRivals();
  await fetchAddedBy();
}

async function removeRival(uid: string) {
  await userStore.removeRival(uid);
  await fetchRivals();
  await fetchAddedBy();
}

if (isLoggedIn.value) {
  fetchRivals();
  fetchAddedBy();
}
</script>

<style scoped>
@import '../styles/Profile.css';
</style>
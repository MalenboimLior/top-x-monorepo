<template>
  <section class="section users-admin">
    <div class="container">
      <header class="users-admin__header">
        <div>
          <h1 class="title">Users</h1>
          <p class="subtitle">Search users and curate featured creators for “Top Creators”.</p>
        </div>
        <div class="buttons">
          <button class="button is-light" type="button" @click="resetSelection" :disabled="isSaving || !isDirty">Reset</button>
          <button class="button is-primary" type="button" @click="save" :disabled="isSaving || !isDirty">
            <span v-if="isSaving" class="loader is-inline"></span>
            <span>{{ isSaving ? 'Saving…' : 'Save changes' }}</span>
          </button>
        </div>
      </header>

      <div v-if="feedback" class="notification" :class="feedback.type === 'success' ? 'is-success' : 'is-danger'">
        {{ feedback.message }}
      </div>

      <div class="users-admin__grid">
        <article class="card users-admin__card">
          <header class="card-header">
            <p class="card-header-title">Search users</p>
          </header>
          <div class="card-content">
            <div class="field has-addons">
              <div class="control is-expanded">
                <input class="input" type="search" placeholder="Search by display name or username…" v-model="searchQuery" @keyup.enter="search" />
              </div>
              <div class="control">
                <button class="button is-link" type="button" @click="search" :disabled="isSearching">
                  {{ isSearching ? 'Searching…' : 'Search' }}
                </button>
              </div>
            </div>
            <p class="help">Type at least two characters. Up to 25 matches are shown.</p>

            <div v-if="error" class="notification is-danger mt-3">{{ error }}</div>

            <div v-if="results.length" class="users-admin__results">
              <article v-for="u in results" :key="u.uid" class="users-admin__result">
                <div class="users-admin__result-meta">
                  <img :src="u.photoURL" alt="avatar" />
                  <div>
                    <p class="has-text-weight-semibold">{{ u.displayName }}</p>
                    <p class="is-size-7 has-text-grey">{{ u.username }}</p>
                  </div>
                </div>
                <div class="buttons are-small">
                  <button class="button is-link" type="button" :disabled="isSelected(u.uid) || selected.length >= 10" @click="addSelected(u.uid)">
                    Add to Top Creators
                  </button>
                </div>
              </article>
            </div>
            <p v-else-if="searchQuery.trim().length >= 2 && !isSearching" class="notification is-light">No users matched “{{ searchQuery }}”.</p>
          </div>
        </article>

        <article class="card users-admin__card">
          <header class="card-header">
            <p class="card-header-title">Featured creators (Top Creators)</p>
          </header>
          <div class="card-content">
            <p class="mb-4">Up to 10 users. Drag to reorder; first is #1.</p>
            <ul v-if="selectedEntries.length" class="users-admin__list">
              <li v-for="(entry, index) in selectedEntries" :key="entry.uid" class="users-admin__list-item">
                <div class="users-admin__list-meta">
                  <span class="tag is-dark is-rounded mr-2">#{{ index + 1 }}</span>
                  <img :src="entry.photoURL" alt="avatar" />
                  <div>
                    <p class="has-text-weight-semibold">{{ entry.displayName }}</p>
                    <p class="is-size-7 has-text-grey">{{ entry.username }}</p>
                  </div>
                </div>
                <div class="buttons are-small">
                  <button class="button" type="button" :disabled="index === 0" @click="move(index, -1)" aria-label="Move up">
                    <span class="icon"><font-awesome-icon icon="arrow-up" /></span>
                  </button>
                  <button class="button" type="button" :disabled="index === selectedEntries.length - 1" @click="move(index, 1)" aria-label="Move down">
                    <span class="icon"><font-awesome-icon icon="arrow-down" /></span>
                  </button>
                  <button class="button is-danger" type="button" @click="remove(index)" aria-label="Remove">
                    <span class="icon"><font-awesome-icon icon="trash" /></span>
                  </button>
                </div>
              </li>
            </ul>
            <p v-else class="notification is-light">No creators selected yet.</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, documentId, deleteField } from 'firebase/firestore';
import { db } from '@top-x/shared';
import type { User } from '@top-x/shared/types/user';
import type { HomePageConfig } from '@top-x/shared/types/home';
import { defaultHomePageConfig } from '@top-x/shared/types/home';

type UsersResult = Pick<User, 'uid' | 'displayName' | 'username' | 'photoURL'> & { uid: string };

const searchQuery = ref('');
const isSearching = ref(false);
const error = ref<string | null>(null);
const results = ref<UsersResult[]>([]);

const selected = ref<string[]>([]);
const initialSelected = ref<string[]>([]);
const isSaving = ref(false);
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

let configUnsub: (() => void) | null = null;

const isDirty = computed(() => JSON.stringify(selected.value) !== JSON.stringify(initialSelected.value));

const selectedEntries = computed(() => {
  const ids = selected.value;
  const pool = new Map<string, UsersResult>(results.value.map((u) => [u.uid, u]));
  return ids.map((id) => pool.get(id)).filter((x): x is UsersResult => Boolean(x));
});

onMounted(() => {
  const refDoc = doc(db, 'config', 'homepage');
  configUnsub = onSnapshot(
    refDoc,
    (snap) => {
      const raw = snap.exists() ? (snap.data() as Partial<HomePageConfig>) : undefined;
      const ids = Array.isArray(raw?.creators?.userIds) ? (raw!.creators!.userIds as string[]) : defaultHomePageConfig.creators!.userIds;
      initialSelected.value = [...ids];
      selected.value = [...ids];
    },
    (e) => {
      console.error('Admin Users: failed to load home config', e);
    },
  );
});

onBeforeUnmount(() => {
  if (configUnsub) {
    configUnsub();
    configUnsub = null;
  }
});

function isSelected(uid: string) {
  return selected.value.includes(uid);
}

function addSelected(uid: string) {
  if (!isSelected(uid) && selected.value.length < 10) {
    selected.value = [...selected.value, uid];
  }
}

function move(index: number, delta: number) {
  const next = index + delta;
  if (next < 0 || next >= selected.value.length) return;
  const list = [...selected.value];
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);
  selected.value = list;
}

function remove(index: number) {
  const list = [...selected.value];
  list.splice(index, 1);
  selected.value = list;
}

function resetSelection() {
  selected.value = [...initialSelected.value];
}

async function search() {
  error.value = null;
  const q = searchQuery.value.trim();
  if (q.length < 2) {
    results.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const usersRef = collection(db, 'users');
    const byDisplay = query(usersRef, where('displayName', '>=', q), where('displayName', '<=', `${q}\uf8ff`));
    const byUsername = query(usersRef, where('username', '>=', q), where('username', '<=', `${q}\uf8ff`));
    const [snapA, snapB] = await Promise.all([getDocs(byDisplay), getDocs(byUsername)]);
    const map = new Map<string, UsersResult>();
    snapA.forEach((d) => {
      const u = d.data() as User;
      map.set(d.id, { uid: d.id, displayName: u.displayName || u.username || 'Anonymous', username: u.username || '', photoURL: u.photoURL || 'https://www.top-x.co/assets/profile.png' });
    });
    snapB.forEach((d) => {
      if (!map.has(d.id)) {
        const u = d.data() as User;
        map.set(d.id, { uid: d.id, displayName: u.displayName || u.username || 'Anonymous', username: u.username || '', photoURL: u.photoURL || 'https://www.top-x.co/assets/profile.png' });
      }
    });
    results.value = Array.from(map.values()).slice(0, 25);
    // enrich currently selected entries to show their names even if not in current results
    const missing = selected.value.filter((id) => !map.has(id)).slice(0, 10);
    if (missing.length) {
      const extra = await getDocs(query(usersRef, where(documentId(), 'in', missing)));
      extra.forEach((d) => {
        const u = d.data() as User;
        map.set(d.id, { uid: d.id, displayName: u.displayName || u.username || 'Anonymous', username: u.username || '', photoURL: u.photoURL || 'https://www.top-x.co/assets/profile.png' });
      });
      results.value = Array.from(map.values()).slice(0, 25);
    }
  } catch (e: any) {
    console.error('Admin Users: search failed', e);
    error.value = e?.message || 'Search failed.';
  } finally {
    isSearching.value = false;
  }
}

async function save() {
  try {
    isSaving.value = true;
    feedback.value = null;
    const ids = Array.from(new Set(selected.value)).slice(0, 10);
    await setDoc(
      doc(db, 'config', 'homepage'),
      {
        creators: {
          userIds: ids.length ? ids : deleteField(),
        },
      },
      { merge: true },
    );
    initialSelected.value = [...ids];
    selected.value = [...ids];
    feedback.value = { type: 'success', message: 'Featured creators updated.' };
  } catch (e: any) {
    console.error('Admin Users: save failed', e);
    feedback.value = { type: 'error', message: e?.message || 'Failed to save featured creators.' };
  } finally {
    isSaving.value = false;
    window.setTimeout(() => (feedback.value = null), 4000);
  }
}
</script>

<style scoped>
.users-admin__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.users-admin__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
  gap: 1.5rem;
}

.users-admin__card {
  height: 100%;
}

.users-admin__results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.users-admin__result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.users-admin__result-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.users-admin__result-meta img {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
}

.users-admin__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.users-admin__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.users-admin__list-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.users-admin__list-meta img {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  object-fit: cover;
}
</style>



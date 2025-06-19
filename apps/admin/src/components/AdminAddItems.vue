<!-- Admin form for adding new pyramid items -->
<template>
  <div>
    <h2>Add Items to Pyramid Cities</h2>
    <form @submit.prevent="addItem">
      <input v-model="newItem.id" placeholder="ID" required />
      <input v-model="newItem.label" placeholder="Label" required />
      <input v-model="newItem.image" placeholder="Image URL" required />
      <button type="submit">Add Item</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';

const gameId = 'Pyramid_Cities';
const newItem = ref({ id: '', label: '', image: '' });

async function addItem() {
  const gameDocRef = doc(db, 'games', gameId);
  await updateDoc(gameDocRef, {
    'custom.items': arrayUnion({
      id: newItem.value.id,
      label: newItem.value.label,
      src: newItem.value.image,
    }),
  });
  newItem.value = { id: '', label: '', image: '' };
}
</script>
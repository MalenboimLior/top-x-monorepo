<template>
  <Card>
    <h2 class="subtitle has-text-white">{{ gameType.id ? 'Edit' : 'Create' }} Game Type</h2>
    <div class="field">
      <label class="label has-text-white">Game Type ID</label>
      <div class="control">
        <input v-model="localGameType.id" class="input" type="text" placeholder="e.g., trivia" :disabled="!!gameType.id" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Name</label>
      <div class="control">
        <input v-model="localGameType.name" class="input" type="text" placeholder="e.g., Trivia" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Description</label>
      <div class="control">
        <textarea v-model="localGameType.description" class="textarea" placeholder="Describe the game type"></textarea>
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Config Type</label>
      <div class="control">
        <div class="select">
          <select v-model="localGameType.custom">
            <option v-for="type in CONFIG_TYPES" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <CustomButton type="is-primary" label="Save" @click="save" :disabled="isSaving" />
      </div>
      <div class="control">
        <CustomButton type="is-light" label="Cancel" @click="$emit('cancel')" />
      </div>
    </div>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
    <p v-if="success" class="notification is-success">{{ success }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { GameType } from '@top-x/shared/types/game';
import { CONFIG_TYPES } from '@top-x/shared/types/game';

const props = defineProps<{
  gameType: GameType;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

const userStore = useUserStore();
const localGameType = ref<GameType>({ ...props.gameType });
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const save = async () => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  if (!localGameType.value.id || !localGameType.value.name) {
    error.value = 'Game Type ID and Name are required';
    return;
  }
  isSaving.value = true;
  error.value = null;
  success.value = null;

  try {
    await setDoc(doc(db, 'gameTypes', localGameType.value.id), {
      name: localGameType.value.name,
      description: localGameType.value.description,
      custom: localGameType.value.custom,
    });
    success.value = `Game Type '${localGameType.value.name}' saved successfully`;
    emit('save');
  } catch (err: any) {
    error.value = `Failed to save game type: ${err.message}`;
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.mt-3 {
  margin-top: 1rem;
}
</style>
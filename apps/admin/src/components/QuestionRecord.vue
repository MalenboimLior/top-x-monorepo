<template>
  <Card>
    <h2 class="subtitle has-text-white">{{ question.id ? 'Edit' : 'Create' }} Question</h2>
    <div class="field">
      <label class="label has-text-white">Question ID</label>
      <div class="control">
        <input v-model="localQuestion.id" class="input" type="text" placeholder="e.g., q_1" :disabled="!!question.id" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Question Text</label>
      <div class="control">
        <textarea v-model="localQuestion.text" class="textarea" placeholder="e.g., What is the capital of France?"></textarea>
      </div>
    </div>
    <div class="field" v-for="(option, index) in localQuestion.options" :key="index">
      <label class="label has-text-white">Option {{ index + 1 }}</label>
      <div class="control">
        <input v-model="localQuestion.options[index]" class="input" type="text" placeholder="e.g., Paris" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Correct Answer</label>
      <div class="control">
        <input v-model="localQuestion.correctAnswer" class="input" type="text" placeholder="e.g., Paris" />
      </div>
    </div>
    <div class="field">
      <label class="label has-text-white">Category (Optional)</label>
      <div class="control">
        <input v-model="localQuestion.category" class="input" type="text" placeholder="e.g., Geography" />
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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { TriviaQuestion } from '@top-x/shared/types/trivia';

const props = defineProps<{
  question: TriviaQuestion;
  gameId: string;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

const userStore = useUserStore();
const localQuestion = ref<TriviaQuestion>({ ...props.question });
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const save = async () => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  if (!localQuestion.value.id || !localQuestion.value.text || !localQuestion.value.correctAnswer) {
    error.value = 'Question ID, Text, and Correct Answer are required';
    return;
  }
  if (localQuestion.value.options.some((o) => !o)) {
    error.value = 'All options must be filled';
    return;
  }
  isSaving.value = true;
  error.value = null;
  success.value = null;

  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const currentQuestions = gameDoc.data().custom?.questions || [];
      const updatedQuestions = props.question.id
        ? currentQuestions.map((q: TriviaQuestion) => (q.id === props.question.id ? localQuestion.value : q))
        : [...currentQuestions, localQuestion.value];
      await updateDoc(gameDocRef, { 'custom.questions': updatedQuestions });
      success.value = `Question '${localQuestion.value.text}' saved successfully`;
      emit('save');
    }
  } catch (err: any) {
    error.value = `Failed to save question: ${err.message}`;
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
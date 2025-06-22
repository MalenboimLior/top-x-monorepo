<template>
  <Card>
    <h2 class="subtitle has-text-white">Questions</h2>
    <CustomButton type="is-primary" label="Add New Question" @click="createNew" />
    <div v-if="questions.length" class="mt-3">
      <div v-for="question in questions" :key="question.id" class="box">
        <p class="title is-6 has-text-white">{{ question.text }}</p>
        <p class="subtitle is-7 has-text-grey-light">ID: {{ question.id }}</p>
        <p class="has-text-grey-light">Options: {{ question.options.join(', ') }}</p>
        <p class="has-text-grey-light">Correct: {{ question.correctAnswer }}</p>
        <p v-if="question.category" class="has-text-grey-light">Category: {{ question.category }}</p>
        <div class="buttons mt-2">
          <CustomButton type="is-warning" label="Edit" @click="$emit('edit', question)" />
          <CustomButton type="is-danger" label="Delete" @click="deleteQuestion(question.id)" />
        </div>
      </div>
    </div>
    <p v-else class="has-text-grey-light">No questions found.</p>
    <p v-if="error" class="notification is-danger">{{ error }}</p>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@top-x/shared';
import { useUserStore } from '@/stores/user';
import Card from '@top-x/shared/components/Card.vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import type { TriviaQuestion } from '@top-x/shared/types';

const props = defineProps<{
  gameId: string;
}>();

const emit = defineEmits<{
  (e: 'edit', question: TriviaQuestion): void;
}>();

const userStore = useUserStore();
const questions = ref<TriviaQuestion[]>([]);
const error = ref<string | null>(null);

const isAdmin = computed(() => userStore.user?.isAdmin || false);

const fetchQuestions = async () => {
  const gameDoc = await getDoc(doc(db, 'games', props.gameId));
  if (gameDoc.exists()) {
    questions.value = gameDoc.data().custom?.questions || [];
  }
};

const deleteQuestion = async (questionId: string) => {
  if (!isAdmin.value) {
    error.value = 'Unauthorized: Admin access required';
    return;
  }
  try {
    const gameDocRef = doc(db, 'games', props.gameId);
    const gameDoc = await getDoc(gameDocRef);
    if (gameDoc.exists()) {
      const updatedQuestions = questions.value.filter((q) => q.id !== questionId);
      await updateDoc(gameDocRef, { 'custom.questions': updatedQuestions });
    }
  } catch (err: any) {
    error.value = `Failed to delete question: ${err.message}`;
  }
};

const createNew = () => {
  emit('edit', { id: '', text: '', options: ['', '', '', ''], correctAnswer: '', category: '' });
};

onMounted(fetchQuestions);
</script>

<style scoped>
.box {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
}
.mt-3 {
  margin-top: 1rem;
}
</style>
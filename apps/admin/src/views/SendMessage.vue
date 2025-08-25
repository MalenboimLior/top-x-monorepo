<template>
  <section class="section">
    <div class="container">
      <h1 class="title has-text-white">Send Message to X</h1>
      <Card>
        <div class="field">
          <label class="label has-text-white">Message Text</label>
          <div class="control">
            <textarea class="textarea" v-model="text" placeholder="Enter your message (max 280 chars)" maxlength="280"></textarea>
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white">Attach Files (images/videos, max 4)</label>
          <div class="control">
            <input type="file" multiple accept="image/*,video/*" @change="handleFiles" />
          </div>
          <p v-if="files.length" class="has-text-grey-light mt-2">Selected: {{ files.length }} file(s)</p>
        </div>
        <Button class="is-primary" @click="sendMessage" :disabled="!text || isSending">
          {{ isSending ? 'Sending...' : 'Send to X' }}
        </Button>
        <p v-if="error" class="has-text-danger mt-3">{{ error }}</p>
        <p v-if="success" class="has-text-success mt-3">Posted successfully! Tweet ID: {{ success }}</p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Card from '@top-x/shared/components/Card.vue';

const text = ref('');
const files = ref<File[]>([]);
const isSending = ref(false);
const error = ref('');
const success = ref('');

const handleFiles = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    files.value = Array.from(input.files).slice(0, 4);  // Limit to 4 for X API
  }
};

const sendMessage = async () => {
  if (!text.value) return;
  isSending.value = true;
  error.value = '';
  success.value = '';

  try {
    const functions = getFunctions();
    const postOnX = httpsCallable(functions, 'postOnX');

    // Prepare media as base64 array
    const media = await Promise.all(
      files.value.map(async (file) => {
        const base64 = await fileToBase64(file);
        return { data: base64.split(',')[1], mimeType: file.type };  // Strip prefix, send mime
      })
    );

    const result = await postOnX({ text: text.value, media });
    const data = result.data as { tweetId: string };
    success.value = data.tweetId;
    text.value = '';
    files.value = [];
  } catch (err: any) {
    error.value = err.message || 'Failed to post';
  } finally {
    isSending.value = false;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};
</script>
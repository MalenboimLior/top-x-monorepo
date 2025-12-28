<template>
  <div class="share-test-page">
    <div class="container">
      <h1 class="title">Android Share Test Page</h1>
      <p class="subtitle">Use this page to test different combinations of navigator.share</p>

      <div class="box">
        <div class="field">
          <label class="label">Share Text</label>
          <div class="control">
            <textarea 
              v-model="testText" 
              class="textarea" 
              placeholder="Enter text to share..."
            ></textarea>
          </div>
        </div>

        <div class="field">
          <label class="label">Share URL</label>
          <div class="control">
            <input 
              v-model="testUrl" 
              class="input" 
              type="text" 
              placeholder="Enter URL to share..."
            />
          </div>
        </div>

        <div class="field">
          <label class="label">Test Image (Canvas/Blob)</label>
          <div class="control">
            <canvas ref="testCanvas" width="300" height="200" style="border: 1px solid #ccc; background: #eee;"></canvas>
            <p class="help">A simple canvas image will be generated for testing.</p>
          </div>
        </div>
      </div>

      <div class="columns is-multiline">
        <!-- TEST 1: TEXT ONLY -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 1: Text Only</h3>
            <button @click="shareTextOnly" class="button is-primary is-fullwidth">Share Text</button>
            <pre class="mt-2 is-size-7">{{ '{ text: ... }' }}</pre>
          </div>
        </div>

        <!-- TEST 2: URL ONLY -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 2: URL Only</h3>
            <button @click="shareUrlOnly" class="button is-link is-fullwidth">Share URL</button>
            <pre class="mt-2 is-size-7">{{ '{ url: ... }' }}</pre>
          </div>
        </div>

        <!-- TEST 3: TEXT + URL -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 3: Text + URL</h3>
            <button @click="shareTextAndUrl" class="button is-info is-fullwidth">Share Both</button>
            <pre class="mt-2 is-size-7">{{ '{ text: ..., url: ... }' }}</pre>
          </div>
        </div>

        <!-- TEST 4: IMAGE ONLY -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 4: Image Only</h3>
            <button @click="shareImageOnly" class="button is-success is-fullwidth">Share Image</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...] }' }}</pre>
          </div>
        </div>

        <!-- TEST 5: IMAGE + TEXT -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 5: Image + Text</h3>
            <button @click="shareImageAndText" class="button is-warning is-fullwidth">Share Image + Text</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], text: ... }' }}</pre>
          </div>
        </div>

        <!-- TEST 6: IMAGE + TEXT + URL -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 6: All Three</h3>
            <button @click="shareAll" class="button is-danger is-fullwidth">Share All</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], text: ..., url: ... }' }}</pre>
          </div>
        </div>

        <!-- TEST 7: ANDROID FIX (TEXT + URL in TEXT FIELD) -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 7: Android Fix</h3>
            <p class="is-size-7 mb-2">(Combine URL into Text when file present)</p>
            <button @click="shareAndroidFix" class="button is-dark is-fullwidth">Share Fix</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], text: text + url }' }}</pre>
          </div>
        </div>

        <!-- TEST 8: IMAGE + TEXT IN TITLE -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 8: Image + Text in Title</h3>
            <p class="is-size-7 mb-2">(Some apps use title as caption)</p>
            <button @click="shareImageTitle" class="button is-light is-fullwidth">Share Title</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], title: text }' }}</pre>
          </div>
        </div>

        <!-- TEST 9: IMAGE + TEXT IN URL FIELD -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 9: Image + Text in URL</h3>
            <p class="is-size-7 mb-2">(Testing user idea: text in url field)</p>
            <button @click="shareImageURLText" class="button is-light is-fullwidth">Share URL-Text</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], url: text }' }}</pre>
          </div>
        </div>

        <!-- TEST 10: IMAGE + SHORT TEXT -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 10: Image + Short Text</h3>
            <p class="is-size-7 mb-2">(Checking if length matters)</p>
            <button @click="shareImageShortText" class="button is-light is-fullwidth">Share Short</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], text: "TOP-X" }' }}</pre>
          </div>
        </div>

        <!-- TEST 11: IMAGE + TEXT IN URL QUERY -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 11: Image + Text in URL Query</h3>
            <p class="is-size-7 mb-2">(Text as a URL parameter)</p>
            <button @click="shareImageURLQuery" class="button is-dark is-fullwidth">Share URL Query</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], url: site + ?msg=text }' }}</pre>
          </div>
        </div>

        <!-- TEST 12: TWO FILES (IMAGE + TXT FILE) -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 12: Two Files</h3>
            <p class="is-size-7 mb-2">(Share Image + Text.txt file)</p>
            <button @click="shareTwoFiles" class="button is-dark is-fullwidth">Share 2 Files</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [img, txt] }' }}</pre>
          </div>
        </div>

        <!-- TEST 13: IMAGE + TEXT (NO TITLE/URL) -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 13: Bare Image + Text</h3>
            <p class="is-size-7 mb-2">(Minimal object, no Title/URL)</p>
            <button @click="shareMinimal" class="button is-dark is-fullwidth">Share Minimal</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], text: text }' }}</pre>
          </div>
        </div>

        <!-- TEST 14: LOGICAL ANDROID WORKAROUND -->
        <div class="column is-one-third">
          <div class="box has-text-centered">
            <h3 class="subtitle is-5">Test 14: Text as Fake URL</h3>
            <p class="is-size-7 mb-2">(Try to trick URL field)</p>
            <button @click="shareFakeURL" class="button is-dark is-fullwidth">Share Fake URL</button>
            <pre class="mt-2 is-size-7">{{ '{ files: [...], url: "https://" + text }' }}</pre>
          </div>
        </div>

      </div>

      <div class="box mt-4" v-if="lastPayload">
        <h4 class="title is-6">Last Sent Payload:</h4>
        <pre class="has-text-info">{{ lastPayload }}</pre>
      </div>

      <div class="box mt-4" v-if="status">
        <h4 class="title is-6">Last Action Status:</h4>
        <pre :class="statusClass">{{ status }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const testText = ref('Check out my TOP-X Pyramid ranking! #TOPX');
const testUrl = ref(window.location.origin);
const testCanvas = ref<HTMLCanvasElement | null>(null);
const status = ref('');
const statusClass = ref('');
const lastPayload = ref('');

onMounted(() => {
  if (testCanvas.value) {
    const ctx = testCanvas.value.getContext('2d');
    if (ctx) {
      // Draw something simple
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, 300, 200);
      ctx.fillStyle = '#00e8e0';
      ctx.font = '24px Inter, sans-serif';
      ctx.fillText('TOP-X', 110, 80);
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('SHARE TEST IMAGE', 80, 110);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px Courier New';
      ctx.fillText(new Date().toLocaleString(), 70, 140);
    }
  }
});

const setStatus = (msg: string, payload: any = null, isError = false) => {
  status.value = `[${new Date().toLocaleTimeString()}] ${msg}`;
  statusClass.value = isError ? 'has-text-danger' : 'has-text-success';
  if (payload) {
    lastPayload.value = JSON.stringify(payload, (key, value) => {
      if (value instanceof File) return `[File: ${value.name} (${value.size} bytes)]`;
      if (Array.isArray(value) && value[0] instanceof File) return `[${value.length} Files]`;
      return value;
    }, 2);
  }
  console.log(msg, payload);
};

const getFile = async (): Promise<File> => {
  return new Promise((resolve) => {
    testCanvas.value!.toBlob((blob) => {
      const file = new File([blob!], 'top-x-share.png', { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
};

const shareTextOnly = async () => {
  const data = { text: testText.value };
  try {
    setStatus('Attempting Share Text Only', data);
    await navigator.share(data);
    setStatus('Text shared successfully', data);
  } catch (e: any) {
    setStatus('Text share failed: ' + e.message, data, true);
  }
};

const shareUrlOnly = async () => {
  const data = { url: testUrl.value };
  try {
    setStatus('Attempting Share URL Only', data);
    await navigator.share(data);
    setStatus('URL shared successfully', data);
  } catch (e: any) {
    setStatus('URL share failed: ' + e.message, data, true);
  }
};

const shareTextAndUrl = async () => {
  const data = { text: testText.value, url: testUrl.value };
  try {
    setStatus('Attempting Share Text + URL', data);
    await navigator.share(data);
    setStatus('Text and URL shared successfully', data);
  } catch (e: any) {
    setStatus('Text and URL share failed: ' + e.message, data, true);
  }
};

const shareImageOnly = async () => {
  try {
    const file = await getFile();
    const data = { files: [file] };
    setStatus('Attempting Share Image Only', data);
    if (navigator.canShare && navigator.canShare(data)) {
      await navigator.share(data);
      setStatus('Image shared successfully', data);
    } else {
      setStatus('Browser cannot share this file', data, true);
    }
  } catch (e: any) {
    setStatus('Image share failed: ' + e.message, null, true);
  }
};

const shareImageAndText = async () => {
  try {
    const file = await getFile();
    const data = { files: [file], text: testText.value };
    setStatus('Attempting Share Image + Text', data);
    await navigator.share(data);
    setStatus('Image and Text shared successfully', data);
  } catch (e: any) {
    setStatus('Image and Text share failed: ' + e.message, data, true);
  }
};

const shareAll = async () => {
  try {
    const file = await getFile();
    const data = { 
      files: [file], 
      text: testText.value, 
      url: testUrl.value,
      title: 'TOP-X Share Test'
    };
    setStatus('Attempting Share All', data);
    await navigator.share(data);
    setStatus('All shared successfully', data);
  } catch (e: any) {
    setStatus('All share failed: ' + e.message, data, true);
  }
};

const shareAndroidFix = async () => {
  try {
    const file = await getFile();
    const data = { 
      files: [file], 
      text: `${testText.value}\n${testUrl.value}`,
      title: 'TOP-X Share'
    };
    setStatus('Attempting Android Fix (Combined Text)', data);
    await navigator.share(data);
    setStatus('Android Fix shared successfully', data);
  } catch (e: any) {
    setStatus('Android Fix share failed: ' + e.message, data, true);
  }
};

const shareImageTitle = async () => {
  try {
    const file = await getFile();
    const data = { files: [file], title: testText.value };
    setStatus('Attempting Image + Title', data);
    await navigator.share(data);
    setStatus('Image + Title shared successfully', data);
  } catch (e: any) {
    setStatus('Image + Title share failed: ' + e.message, data, true);
  }
};

const shareImageURLText = async () => {
  try {
    const file = await getFile();
    const data = { files: [file], url: testText.value };
    setStatus('Attempting Image + URL-Text (Raw String)', data);
    await navigator.share(data);
    setStatus('Image + URL-Text shared successfully', data);
  } catch (e: any) {
    setStatus('Image + URL-Text share failed: ' + e.message, data, true);
  }
};

const shareImageShortText = async () => {
  try {
    const file = await getFile();
    const data = { files: [file], text: 'TOP-X' };
    setStatus('Attempting Image + Short Text', data);
    await navigator.share(data);
    setStatus('Image + Short Text shared successfully', data);
  } catch (e: any) {
    setStatus('Image + Short Text share failed: ' + e.message, data, true);
  }
};

const shareImageURLQuery = async () => {
  try {
    const file = await getFile();
    const data = { 
      files: [file], 
      url: `${testUrl.value}?msg=${encodeURIComponent(testText.value)}` 
    };
    setStatus('Attempting Image + URL Query', data);
    await navigator.share(data);
  } catch (e: any) {
    setStatus('Image + URL Query failed: ' + e.message, data, true);
  }
};

const shareTwoFiles = async () => {
  try {
    const imgFile = await getFile();
    const txtBlob = new Blob([testText.value], { type: 'text/plain' });
    const txtFile = new File([txtBlob], 'TOP-X-RESULTS.txt', { type: 'text/plain' });
    const data = { files: [imgFile, txtFile] };
    setStatus('Attempting Share Two Files (PNG + TXT)', data);
    await navigator.share(data);
  } catch (e: any) {
    setStatus('Two Files share failed: ' + e.message, data, true);
  }
};

const shareMinimal = async () => {
  try {
    const file = await getFile();
    const data = { files: [file], text: testText.value };
    setStatus('Attempting Bare Image + Text', data);
    await navigator.share(data);
  } catch (e: any) {
    setStatus('Bare Image + Text failed: ' + e.message, data, true);
  }
};

const shareFakeURL = async () => {
  try {
    const file = await getFile();
    // Some browsers reject non-URL strings in url field, so we try making it look like a URL
    const fakeUrl = 'https://' + testText.value.replace(/[^a-zA-Z0-9]/g, '-') + '.topx.co';
    const data = { files: [file], url: fakeUrl };
    setStatus('Attempting Text as Fake URL', data);
    await navigator.share(data);
  } catch (e: any) {
    setStatus('Fake URL share failed: ' + e.message, data, true);
  }
};
</script>

<style scoped>
.share-test-page {
  padding: 2rem 1rem;
  background: #f5f5f5;
  min-height: 100vh;
  color: #333;
}
.box {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.textarea, .input {
  background: white;
  color: #333;
  border: 1px solid #ccc;
}
pre {
  background: #222;
  color: #0f0;
  padding: 0.5rem;
  border-radius: 4px;
  overflow: auto;
}
.has-text-success { color: green !important; }
.has-text-danger { color: red !important; }
</style>

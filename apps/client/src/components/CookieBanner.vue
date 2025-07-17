<template>
  <div class="cookie-banner notification" v-if="showBanner">
    <div class="content">
      <p>
        We use cookies to enhance your experience. Essential cookies are always active. You can manage preferences for analytics and other cookies.
      </p>
      <div class="buttons">
        <button class="button is-primary" @click="acceptAll">Accept All</button>
        <button class="button is-light" @click="acceptEssential">Accept Essential</button>
        <!-- <button class="button is-link" @click="managePreferences">Manage Preferences</button> -->
      </div>
      <p class="mt-3">
        See our <router-link to="/privacy">Privacy Policy</router-link> for details.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const showBanner = ref(false);
const emit = defineEmits(['consent-given']);

const checkConsent = () => {
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) {
    showBanner.value = true;
  }
};

const acceptAll = () => {
  localStorage.setItem('cookieConsent', 'all');
  showBanner.value = false;
  emit('consent-given', 'all');
};

const acceptEssential = () => {
  localStorage.setItem('cookieConsent', 'essential');
  showBanner.value = false;
  emit('consent-given', 'essential');
};

const managePreferences = () => {
  // For now, treat as accept essential; expand later for modal with toggles
  acceptEssential();
};

onMounted(checkConsent);
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 1rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .buttons {
    flex-direction: column;
  }
}
</style>
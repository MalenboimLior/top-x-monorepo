<template>
  <transition name="slide-up">
    <div v-if="showBanner" class="cookie-banner">
      <div class="layout-container">
        <div class="cookie-content">
          <p class="cookie-text">
            {{ textParts.before }}
            <a href="https://top-x.co/cookies/" target="_blank" class="cookie-link">
              {{ t('cookies.banner.linkText') }}
            </a>
            {{ textParts.after }}
          </p>
          <button class="cookie-accept" @click="accept">
            {{ t('cookies.banner.accept') }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const route = useRoute();
const t = (key: string) => localeStore.translate(key);

const showBanner = ref(false);
const CONSENT_KEY = 'topx_cookie_consent';

const textParts = computed(() => {
  const fullText = t('cookies.banner.text');
  const [before, after] = fullText.split('{link}');
  return { before, after: after || '' };
});

const checkConsent = () => {
  const consent = localStorage.getItem(CONSENT_KEY);
  const seen = localStorage.getItem(CONSENT_KEY + '_seen');
  
  if (!consent && !seen) {
    showBanner.value = true;
    // Mark as seen immediately so it doesn't show on refresh
    localStorage.setItem(CONSENT_KEY + '_seen', 'true');
  }
};

const accept = () => {
  localStorage.setItem(CONSENT_KEY, 'true');
  showBanner.value = false;
};

// Hide banner if user navigates to a new page
watch(
  () => route.path,
  () => {
    if (showBanner.value) {
      showBanner.value = false;
    }
  }
);

onMounted(checkConsent);
</script>

<style scoped>
.cookie-banner {
  width: 100%;
  background: var(--color-bg-surface, #1c1c21);
  border-bottom: 1px solid var(--color-border-base, rgba(255, 255, 255, 0.1));
  padding: 0.75rem 0;
  z-index: 90;
  position: relative;
}

.cookie-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  justify-content: center;
}

.cookie-text {
  color: var(--bulma-text, #fff);
  font-size: 0.85rem;
  line-height: 1.4;
  margin: 0;
  font-weight: 500;
  text-align: center;
}

.cookie-link {
  color: var(--bulma-primary, #00d1b2);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity 0.2s;
  font-weight: 600;
}

.cookie-link:hover {
  opacity: 0.8;
}

.cookie-accept {
  background: var(--bulma-primary, #00d1b2);
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.cookie-accept:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.cookie-accept:active {
  transform: translateY(0);
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 100px;
  overflow: hidden;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .cookie-content {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem;
  }
  
  .cookie-text {
    font-size: 0.8rem;
  }
  
  .cookie-accept {
    width: 100%;
  }
}
</style>
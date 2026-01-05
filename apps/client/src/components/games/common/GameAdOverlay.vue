<template>
  <div class="game-ad-overlay">
    <div class="ad-container">
      <div class="ad-header">
        <h3>{{ t(titleKey) }}</h3>
      </div>
      
      <div class="ad-content">
        <ins
          class="adsbygoogle"
          style="display:block; width: 100%; min-height: 250px;"
          :data-ad-client="adClient"
          :data-ad-slot="adSlot"
          data-ad-format="auto"
          data-full-width-responsive="true"
          target="_blank"
        ></ins>
      </div>

      <div class="ad-footer">
        <button 
          class="continue-button" 
          :disabled="countdown > 0"
          @click="handleContinue"
        >
          <span v-if="countdown > 0">{{ t(waitingKey) }} ({{ countdown }})</span>
          <span v-else>{{ t(continueKey) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { pushAdSenseSlot } from '@/utils/googleAdsense';

interface Props {
  adClient?: string;
  adSlot?: string;
  autoCloseDelay?: number; // in seconds, 0 = no auto-close
  titleKey?: string;
  waitingKey?: string;
  continueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  adClient: import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID || 'ca-pub-1234567890',
  adSlot: import.meta.env.VITE_GOOGLE_ADS_SLOT_ID || '1234567890',
  autoCloseDelay: 5,
  titleKey: 'games.ad.title',
  waitingKey: 'games.ad.continue',
  continueKey: 'games.ad.continue',
});

const emit = defineEmits<{
  (e: 'continue'): void;
}>();

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const countdown = ref(props.autoCloseDelay);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  console.log('[GameAdOverlay] Showing ad overlay', {
    adClient: props.adClient,
    adSlot: props.adSlot,
    autoCloseDelay: props.autoCloseDelay,
  });

  // Push the ad slot
  try {
    pushAdSenseSlot();
    console.log('[GameAdOverlay] AdSense slot pushed successfully');
  } catch (error) {
    console.error('[GameAdOverlay] Failed to push AdSense slot:', error);
    console.log('[GameAdOverlay] No ad available - AdSense push failed');
  }

  // Check if ad loaded after a short delay
  setTimeout(() => {
    const adElement = document.querySelector('.adsbygoogle');
    if (adElement) {
      const isAdFilled = adElement.getAttribute('data-ad-status') === 'filled';
      const hasContent = adElement.children.length > 0;
      
      if (!isAdFilled && !hasContent) {
        console.log('[GameAdOverlay] No ad available - AdSense did not fill the slot');
      } else {
        console.log('[GameAdOverlay] Ad loaded successfully');
      }
    } else {
      console.log('[GameAdOverlay] No ad available - AdSense element not found');
    }
  }, 1000);

  // Start countdown - enables the button when finished
  if (props.autoCloseDelay > 0) {
    countdownInterval = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        if (countdownInterval) clearInterval(countdownInterval);
        console.log('[GameAdOverlay] Countdown finished - Continue button enabled');
      }
    }, 1000);
  }
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

const handleContinue = () => {
  if (countdown.value > 0) return; // Prevent accidental bypass
  console.log('[GameAdOverlay] User clicked continue');
  emit('continue');
};
</script>

<style scoped>
.game-ad-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(8px);
}

.ad-container {
  background: rgba(10, 12, 25, 0.95);
  border-radius: 20px;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.ad-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.ad-header h3 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin: 0;
}

.ad-content {
  min-height: 250px;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
}

.ad-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.continue-button {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.continue-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.continue-button:active {
  transform: translateY(0);
}

.continue-button:disabled {
  background: #333;
  color: #777;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

.ad-timer {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

@media (max-width: 768px) {
  .ad-container {
    padding: 1.5rem;
  }

  .ad-header h3 {
    font-size: 1.25rem;
  }

  .continue-button {
    width: 100%;
  }
}
</style>

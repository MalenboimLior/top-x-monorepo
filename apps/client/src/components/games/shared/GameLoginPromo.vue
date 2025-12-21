<template>
  <div :class="['game-login-promo', mode, { 'is-visible': isVisible }]">
    <div class="content-wrapper" @click.stop>
      <h3 class="promo-title">
        {{ title || t('games.promo.title') }}
      </h3>
      
      <p class="promo-subtitle">
        {{ subtitle || t('games.promo.subtitle') }}
      </p>
      
      <p class="promo-privacy">
        {{ privacy || t('games.promo.privacy') }}
      </p>

      <div class="action-area">
        <CustomButton
          type="is-primary"
          :label="t('games.loginButton')"
          :icon="['fab', 'x-twitter']"
          :loading="loading"
          @click="handleLogin"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const props = defineProps<{
  mode?: 'inline' | 'fixed' | 'overlay';
  title?: string;
  subtitle?: string;
  privacy?: string;
  gameId?: string;
  context?: string;
  isVisible?: boolean; // For fixed/overlay modes to control transition
}>();

const emit = defineEmits(['login-success', 'close']);

const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const loading = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    await userStore.loginWithX();
    if (analytics) {
      logEvent(analytics, 'user_action', { 
        action: 'login', 
        method: 'x_auth', 
        context: props.context || 'game_promo', 
        game_id: props.gameId 
      });
    }
    emit('login-success');
  } catch (error) {
    console.error('Login failed:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.game-login-promo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(31, 31, 31, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%);
  border: 1px solid rgba(0, 232, 224, 0.3);
  box-shadow: 0 8px 32px rgba(0, 232, 224, 0.15);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  width: 100%;
}

/* Add a subtle glow/shine effect */
.game-login-promo::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 232, 224, 0.05) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 500px;
}

.promo-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
  background: linear-gradient(90deg, #fff, #00e8e0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.promo-subtitle {
  font-size: 1.1rem;
  color: #ccc;
  line-height: 1.5;
  margin: 0;
  max-width: 90%;
}

.promo-privacy {
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.5rem;
  max-width: 90%;
}

.action-area {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* === MODES === */

/* INLINE MODE (Default card) */
.game-login-promo.inline {
  margin: 2rem auto;
  max-width: 600px;
  transform: translateY(0);
}

/* FIXED MODE (Bottom Sheet / Sticky Footer) */
.game-login-promo.fixed {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 100%); /* Start hidden */
  border-radius: 24px 24px 0 0;
  border-bottom: none;
  z-index: 1000;
  width: 100%;
  max-width: 500px; /* Constrain on desktop */
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
  padding-bottom: env(safe-area-inset-bottom, 2rem); /* Handle iPhone notches */
}

/* Slide up animation for fixed mode */
.game-login-promo.fixed.is-visible {
  transform: translate(-50%, 0);
}

/* OVERLAY MODE (Centered Modal-ish) */
.game-login-promo.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

/* === RESPONSIVE === */
@media screen and (max-width: 767px) {
  .game-login-promo {
    padding: 1.5rem;
  }
  
  .game-login-promo.inline {
    border-radius: 12px;
    margin: 1rem 0;
    width: 100%;
  }

  .game-login-promo.fixed {
    max-width: 100%; /* Full width on mobile */
    border-radius: 20px 20px 0 0;
    border-left: none;
    border-right: none;
  }

  .promo-title {
    font-size: 1.3rem;
  }
  
  .promo-subtitle {
    font-size: 1rem;
  }
}
</style>

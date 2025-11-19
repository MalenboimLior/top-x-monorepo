<template>
  <section class="hero-section layout-container" :class="{ 'is-rtl': isRTL }">
    <div class="hero-background" aria-hidden="true"></div>
    <div class="hero-pulse" aria-hidden="true"></div>

    <div class="hero-content">
      <img :src="logo" alt="TOP-X logo" class="hero-logo" />

      <h1 class="hero-heading" dir="ltr">Top Them All!</h1>

      <p class="hero-platform">{{ t('home.heroPlatform') }}</p>

      <p class="hero-tagline" aria-live="polite">
        <span class="tagline-text">{{ displayedTagline }}</span>
        <span
          class="tagline-cursor"
          :class="{ 'is-active': taglineAnimationRunning }"
          aria-hidden="true"
        ></span>
      </p>

      <!-- <p v-if="challengeVisible" class="hero-challenge">
        <span class="challenge-crown" aria-hidden="true">👑</span>
        <span>{{ t('home.heroChallenge') }}</span>
      </p> -->

      <div class="hero-actions" >
        <button class="hero-button hero-button--secondary" type="button" @click="onPlayClick">
          {{ t('home.ctaPlay') }}
        </button>
        <CustomButton
          class="hero-button hero-button--primary"
          type="is-primary"
          :label="t('home.ctaCreate')"
          @click="onCreateClick"
        />
        
      </div>
    </div>

    <!-- <div class="hero-peek">
      <span>{{ t('home.hotGames') }}</span>
    </div> -->
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import topxLogo from '@/assets/topx-logo.png';
import topxLogoBlack from '@/assets/topx-logo-black.png';
import { useLocaleStore } from '@/stores/locale';
import { useThemeStore } from '@/stores/theme';

const emit = defineEmits<{
  (event: 'create'): void;
  (event: 'play'): void;
}>();

const localeStore = useLocaleStore();
const themeStore = useThemeStore();
const theme = computed(() => themeStore.theme);
const t = (key: string) => localeStore.translate(key);

const isRTL = computed(() => localeStore.direction === 'rtl');

const displayedTagline = ref('');
const taglineAnimationRunning = ref(false);
const challengeVisible = ref(false);

let typewriterTimeouts: number[] = [];
let challengeTimeout: number | null = null;

const heroTagline = computed(() => t('home.heroTagline'));

function clearTypewriter() {
  if (typeof window === 'undefined') {
    typewriterTimeouts = [];
    return;
  }
  for (const timeout of typewriterTimeouts) {
    window.clearTimeout(timeout);
  }
  typewriterTimeouts = [];
}

function scheduleTaglineAnimation(text: string) {
  clearTypewriter();
  displayedTagline.value = '';

  if (!text) {
    taglineAnimationRunning.value = false;
    return;
  }

  if (typeof window === 'undefined') {
    displayedTagline.value = text;
    taglineAnimationRunning.value = false;
    return;
  }

  taglineAnimationRunning.value = true;
  const characters = Array.from(text);

  characters.forEach((char, index) => {
    const timeout = window.setTimeout(() => {
      displayedTagline.value += char;
      if (index === characters.length - 1) {
        taglineAnimationRunning.value = false;
      }
    }, index * 60);
    typewriterTimeouts.push(timeout);
  });
}

function scheduleChallengeReveal() {
  if (typeof window === 'undefined') {
    challengeVisible.value = true;
    return;
  }

  if (challengeTimeout) {
    window.clearTimeout(challengeTimeout);
  }

  challengeVisible.value = false;
  challengeTimeout = window.setTimeout(() => {
    challengeVisible.value = true;
  }, 1500);
}

watch(heroTagline, (newTagline) => {
  scheduleTaglineAnimation(newTagline);
  scheduleChallengeReveal();
}, { immediate: true });

onBeforeUnmount(() => {
  clearTypewriter();
  if (typeof window !== 'undefined' && challengeTimeout) {
    window.clearTimeout(challengeTimeout);
  }
  challengeTimeout = null;
});

function onCreateClick() {
  emit('create');
}

function onPlayClick() {
  emit('play');
}

const logo = computed(() => (theme.value === 'dark' ? topxLogo : topxLogoBlack));
</script>

<style scoped>
.hero-section {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(var(--space-6), 5vh, var(--space-8))
         var(--layout-inline-padding)
         clamp(var(--space-6), 7vh, var(--space-8));

  background: transparent;
  color: var(--color-text-primary);
  text-align: center;
}

.hero-section.is-rtl {
  direction: rtl;
}

.hero-background,
.hero-pulse {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-background {
  display: none; /* Removed for flat design */
}

.hero-pulse {
  display: none; /* Removed for flat design */
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.5rem, 1vh, 0.875rem);
}

.hero-logo {
  width: min(220px, 26vw);
  height: auto;
}

.hero-heading {
  font-size: clamp(1.6rem, 5vw, 2.7rem);
  /*height: 70px;*/
  font-weight: 800;
  letter-spacing: 0.04em;
  /*  text-transform: uppercase;*/
  color: #00e8e0;
  margin: 0;
  line-height: 1.15;
}

.hero-platform {
  font-size: clamp(1.5rem, 3.4vw, 2.3rem);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.15;
}

.hero-tagline {
  font-size: clamp(1.2rem, 3.2vw, 1.8rem);
  font-weight: 700;
  color: #c4ff00;
  margin: 0;
  min-height: 2.6rem;
  line-height: 1.15;
}

.tagline-text {
  display: inline-block;
}

.tagline-cursor {
  display: inline-block;
  width: 0.1em;
  height: 1.2em;
  margin-inline-start: 0.1em;
  background: #c4ff00;
  opacity: 0;
  animation: none;
}

.tagline-cursor.is-active {
  opacity: 1;
  animation: blink 0.9s steps(1, start) infinite;
}

.hero-challenge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: clamp(1rem, 2.8vw, 1.35rem);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  padding: 0.75rem 1.1rem;
  border-radius: 999px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-accent);
}

.challenge-crown {
  font-size: 1.35em;
  display: inline-flex;
  animation: crown-flash 1.8s ease-in-out infinite;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 100%;
  max-width: 420px;
  margin-top: 0.75rem;
}

.hero-actions.is-rtl {
  flex-direction: row-reverse;
}

.hero-button {
  flex: 1;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.9rem 1.25rem;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), transform 0.2s ease;
}

.hero-button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.hero-button--primary {
  border: 1px solid var(--color-primary);
}

.hero-button--secondary {
  background-color: transparent;
  border: 2px solid var(--color-border-base);
  color: var(--color-text-primary);
  cursor: pointer;
}

.hero-button--secondary:hover {
  background-color: var(--color-accent-bg);
  border-color: var(--color-border-accent);
  color: var(--color-text-primary);
}

.hero-button--secondary:active {
  transform: scale(0.98);
}

.hero-button:hover {
  transform: none;
}

.hero-peek {
  position: absolute;
  bottom: 1.5rem;
  inset-inline: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.hero-peek span {
  background: rgba(5, 5, 5, 0.85);
  border: 1px solid rgba(196, 255, 0, 0.4);
  color: #c4ff00;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.45);
}

@keyframes blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.15;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.35;
  }
}

@keyframes crown-flash {
  0%,
  100% {
    filter: drop-shadow(0 0 0 rgba(196, 255, 0, 0));
    transform: scale(1);
  }
  40% {
    filter: drop-shadow(0 0 12px rgba(196, 255, 0, 0.75));
    transform: scale(1.12);
  }
  60% {
    transform: scale(1.05);
  }
}

@media (max-width: 960px) {
  .hero-section {
    min-height: 40vh;
    padding: clamp(var(--space-2), 2vh, var(--space-3))
             var(--layout-inline-padding)
             clamp(var(--space-2), 2vh, var(--space-3));
  }
}

@media (max-width: 768px) {
  .hero-content {
    gap: clamp(0.4rem, 1.1vh, 0.65rem);
  }

  .hero-actions {
    flex-direction: column;
    margin-top: 0.4rem;
    gap: 0.6rem;
  }

  .hero-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: clamp(var(--space-1), 1vh, var(--space-2))
             var(--layout-inline-padding)
             clamp(var(--space-1), 1vh, var(--space-2));
  }

  .hero-actions {
    margin-top: 0.3rem;
    gap: 0.5rem;
  }
}
</style>


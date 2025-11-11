<template>
  <section class="hero-section layout-container" :class="{ 'is-rtl': isRTL }">
    <div class="hero-background" aria-hidden="true"></div>
    <div class="hero-pulse" aria-hidden="true"></div>

    <div class="hero-content">
      <img :src="logo" alt="TOP-X logo" class="hero-logo" />

      <h1 class="hero-heading">Top Them All!</h1>

      <p class="hero-platform">{{ t('home.heroPlatform') }}</p>

      <p class="hero-tagline" aria-live="polite">
        <span class="tagline-text">{{ displayedTagline }}</span>
        <span v-if="taglineAnimationRunning" class="tagline-cursor" aria-hidden="true"></span>
      </p>

      <p v-if="challengeVisible" class="hero-challenge">
        <span class="challenge-crown" aria-hidden="true">👑</span>
        <span>{{ t('home.heroChallenge') }}</span>
      </p>

      <div class="hero-actions" :class="{ 'is-rtl': isRTL }">
        <CustomButton
          class="hero-button hero-button--primary"
          type="is-primary"
          :label="t('home.ctaCreate')"
          @click="onCreateClick"
        />
        <button class="hero-button hero-button--secondary" type="button" @click="onPlayClick">
          {{ t('home.ctaPlay') }}
        </button>
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
import { useLocaleStore } from '@/stores/locale';

const emit = defineEmits<{
  (event: 'create'): void;
  (event: 'play'): void;
}>();

const localeStore = useLocaleStore();
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
    }, index * 85);
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

const logo = topxLogo;
</script>

<style scoped>
.hero-section {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(var(--space-7), 10vh, var(--space-9)) var(--layout-inline-padding) clamp(var(--space-8), 12vh, var(--space-9));
  background: rgba(5, 5, 5, 0.78);
  border-radius: clamp(28px, 6vw, 44px);
  border: 1px solid rgba(0, 232, 224, 0.16);
  box-shadow: 0 42px 80px rgba(0, 0, 0, 0.45);
  color: #ffffff;
  text-align: center;
  overflow: hidden;
  backdrop-filter: blur(14px);
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
  background: radial-gradient(circle at center, rgba(0, 232, 224, 0.25) 0%, rgba(0, 0, 0, 0.55) 58%, rgba(0, 0, 0, 0.85) 100%);
}

.hero-pulse {
  background: radial-gradient(circle at 50% 42%, rgba(196, 255, 0, 0.18), transparent 58%);
  opacity: 0.85;
  animation: pulse 6s ease-in-out infinite;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1rem, 2vh, 1.5rem);
}

.hero-logo {
  width: min(140px, 26vw);
  height: auto;
  filter: drop-shadow(0 18px 32px rgba(0, 232, 224, 0.35));
}

.hero-heading {
  font-size: clamp(2.3rem, 5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #00e8e0;
  margin: 0;
  text-shadow: 0 24px 55px rgba(0, 232, 224, 0.45);
}

.hero-platform {
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  margin: 0;
}

.hero-tagline {
  font-size: clamp(1.4rem, 3.6vw, 2.1rem);
  font-weight: 700;
  color: #c4ff00;
  margin: 0;
  min-height: 2.6rem;
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
  animation: blink 0.9s steps(1, start) infinite;
}

.hero-challenge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: clamp(1rem, 2.8vw, 1.35rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  padding: 0.75rem 1.1rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(196, 255, 0, 0.28);
  backdrop-filter: blur(8px);
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero-button:focus-visible {
  outline: 3px solid rgba(196, 255, 0, 0.7);
  outline-offset: 3px;
}

.hero-button--primary {
  box-shadow: 0 18px 40px rgba(0, 232, 224, 0.35);
}

.hero-button--secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.45);
}

.hero-button--secondary:hover {
  background: rgba(196, 255, 0, 0.18);
  border-color: rgba(196, 255, 0, 0.75);
}

.hero-button--secondary:active {
  transform: scale(0.98);
}

.hero-button:hover {
  transform: translateY(-2px);
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
    min-height: 70vh;
    padding: clamp(var(--space-6), 12vh, var(--space-8)) var(--layout-inline-padding) clamp(var(--space-7), 10vh, var(--space-8));
  }
}

@media (max-width: 768px) {
  .hero-content {
    gap: 1rem;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-actions.is-rtl {
    flex-direction: column;
  }

  .hero-button {
    width: 100%;
  }
}
</style>


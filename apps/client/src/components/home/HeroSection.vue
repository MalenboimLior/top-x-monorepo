<template>
  <section class="hero-section" :class="{ 'is-rtl': isRTL }">
    <!-- Background Elements -->
    <div class="hero-bg-glow hero-bg-glow--1" aria-hidden="true"></div>
    <div class="hero-bg-glow hero-bg-glow--2" aria-hidden="true"></div>
    <div class="hero-grid-pattern" aria-hidden="true"></div>

    <div class="hero-content layout-container">
      <div class="hero-main">
        <div class="hero-badge fade-in-up" :style="{ animationDelay: '0.1s' }">
          <span class="hero-badge-icon">✨</span>
          <span class="hero-badge-text">{{ t('home.heroPlatform') }}</span>
        </div>

        <h1 class="hero-title fade-in-up" :style="{ animationDelay: '0.2s' }">
          <span class="text-gradient-primary">Play.</span>
          <span class="text-gradient-secondary">Compete.</span>
          <br class="mobile-break" />
          <span class="text-outline">Top Them All.</span>
        </h1>

        <div class="hero-description fade-in-up" :style="{ animationDelay: '0.3s' }">
          <p class="hero-tagline">
            <span class="tagline-text">{{ displayedTagline }}</span>
            <span class="tagline-cursor" :class="{ 'is-active': taglineAnimationRunning }" aria-hidden="true">|</span>
          </p>
        </div>

        <div class="hero-actions fade-in-up" :style="{ animationDelay: '0.4s' }">
          <button class="btn-primary" @click="onPlayClick">
            <span class="btn-content">
              {{ t('home.ctaPlay') }}
              <i class="fas fa-arrow-right btn-icon" :class="{ 'fa-flip-horizontal': isRTL }"></i>
            </span>
            <div class="btn-glow"></div>
          </button>
          
          <button class="btn-secondary" @click="onCreateClick">
            <span class="btn-content">
              {{ t('home.ctaCreate') }}
            </span>
          </button>
        </div>

        <!-- Stats / Social Proof -->
        <div class="hero-stats fade-in-up" :style="{ animationDelay: '0.5s' }">
          <div class="stat-item">
            <span class="stat-value">100+</span>
            <span class="stat-label">{{ t('home.heroStats.dailyChallenges') }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">10k+</span>
            <span class="stat-label">{{ t('home.heroStats.activePlayers') }}</span>
          </div>
        </div>
      </div>

      <!-- Visual Element (Optional 3D or Illustration placeholder) -->
      <div class="hero-visual fade-in-up" :style="{ animationDelay: '0.6s' }">
        <div class="floating-card card-1">
          <div class="card-icon">🏆</div>
          <div class="card-content">
            <div class="card-line short"></div>
            <div class="card-line long"></div>
          </div>
        </div>
        <div class="floating-card card-2">
          <div class="card-icon">🎮</div>
          <div class="card-content">
            <div class="card-line medium"></div>
            <div class="card-line short"></div>
          </div>
        </div>
        <div class="hero-logo-container">
           <img 
            :src="logo" 
            alt="TOP-X logo" 
            class="hero-logo-img" 
            fetchpriority="high"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
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
let typewriterTimeouts: number[] = [];

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
    }, index * 50);
    typewriterTimeouts.push(timeout);
  });
}

watch(heroTagline, (newTagline) => {
  scheduleTaglineAnimation(newTagline);
}, { immediate: true });

onBeforeUnmount(() => {
  clearTypewriter();
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
@import '@/styles/components/Home.css';
</style>


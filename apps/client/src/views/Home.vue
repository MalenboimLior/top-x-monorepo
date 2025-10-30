<!-- Home.vue -->
<template>
  <div class="home-page section-stack">
    <section class="hero layout-container">
      <div class="hero-content">
        <div class="hero-eyebrow">
          <span class="hero-pill">TOP-X</span>
          <span class="hero-eyebrow-text">{{ t('home.heroEyebrow') }}</span>
        </div>
        <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
        <p class="hero-subtitle">{{ t('home.heroSubtitle') }}</p>
        <div class="hero-actions">
          <CustomButton
            type="is-primary is-medium hero-button"
            :label="t('home.playNow')"
            @click="goToChallenges"
          />
          <button class="hero-link" type="button" @click="goToBuilder">
            {{ t('home.exploreCollection') }}
          </button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-glow"></div>
        <img src="../assets/topx-logo.png" alt="TOP-X" class="hero-logo" />
      </div>
    </section>

    <section class="layout-container section-stack feature-section">
      <header class="section-header">
        <h2 class="section-title">{{ t('home.features.title') }}</h2>
        <p class="section-subtitle">{{ t('home.features.subtitle') }}</p>
      </header>
      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card surface">
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section class="layout-container section-stack steps-section">
      <header class="section-header">
        <h2 class="section-title">{{ t('home.steps.title') }}</h2>
        <p class="section-subtitle">{{ t('home.steps.subtitle') }}</p>
      </header>
      <ol class="steps-grid">
        <li v-for="(step, index) in steps" :key="step.title" class="steps-card surface">
          <span class="steps-number">{{ index + 1 }}</span>
          <h3 class="steps-title">{{ step.title }}</h3>
          <p class="steps-description">{{ step.description }}</p>
        </li>
      </ol>
    </section>

    <section class="layout-container section-stack cta-section">
      <div class="cta-card surface">
        <div class="cta-content">
          <h2 class="cta-title">{{ t('home.cta.title') }}</h2>
          <p class="cta-subtitle">{{ t('home.cta.subtitle') }}</p>
        </div>
        <div class="cta-actions">
          <CustomButton
            type="is-primary is-medium"
            :label="t('home.cta.primary')"
            @click="goToChallenges"
          />
          <button class="hero-link" type="button" @click="goToBuilder">
            {{ t('home.cta.secondary') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';

const router = useRouter();
const localeStore = useLocaleStore();

const t = (key: string) => localeStore.translate(key);

const features = computed(() => [
  {
    title: t('home.features.items.play.title'),
    description: t('home.features.items.play.description'),
  },
  {
    title: t('home.features.items.compete.title'),
    description: t('home.features.items.compete.description'),
  },
  {
    title: t('home.features.items.create.title'),
    description: t('home.features.items.create.description'),
  },
]);

const steps = computed(() => [
  {
    title: t('home.steps.items.choose.title'),
    description: t('home.steps.items.choose.description'),
  },
  {
    title: t('home.steps.items.challenge.title'),
    description: t('home.steps.items.challenge.description'),
  },
  {
    title: t('home.steps.items.share.title'),
    description: t('home.steps.items.share.description'),
  },
]);

const pageTitle = computed(() => t('home.metaTitle'));
const pageDescription = computed(() => t('home.metaDescription'));

useHead(() => ({
  title: pageTitle.value,
  meta: [
    {
      name: 'description',
      content: pageDescription.value,
    },
  ],
}));

function goToChallenges() {
  router.push({ name: 'DailyChallenges' });
}

function goToBuilder() {
  router.push({ name: 'Build' });
}
</script>

<style scoped>
@import '../styles/Home.css';
</style>

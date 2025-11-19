<template>
  <div class="page-container about-page">
    <section class="about-hero">
      <div class="about-hero__glow"></div>
      <div class="about-hero__content">
        <p class="about-hero__pill">Community powered</p>
        <h1 class="about-hero__title">{{ t('about.title') }}</h1>
        <p class="about-hero__subtitle">
          {{ t('about.subtitle') }}
        </p>
        <div class="about-hero__stats">
          <div class="stat">
            <span class="stat__value">24/7</span>
            <span class="stat__label">Play from anywhere</span>
          </div>
          <div class="stat">
            <span class="stat__value">∞</span>
            <span class="stat__label">Game possibilities</span>
          </div>
          <div class="stat">
            <span class="stat__value">100%</span>
            <span class="stat__label">Social & fun</span>
          </div>
        </div>
      </div>
    </section>

    <section class="about-body fade-in">
      <div class="about-surface">
        <div class="about-copy">
          <p>{{ t('about.paragraph1') }}</p>
          <p>{{ t('about.paragraph2') }}</p>
          <p v-html="t('about.paragraph3')"></p>
          <p v-html="t('about.paragraph4')"></p>
        </div>
        <CustomButton
          type="is-primary is-large"
          :label="t('about.cta')"
          @click="$router.push('/')"
        />
      </div>
    </section>

    <section class="about-highlights">
      <div class="highlight-card">
        <h3>Built for live moments</h3>
        <p>Launch games instantly during streams, parties, or team hangouts.</p>
      </div>
      <div class="highlight-card">
        <h3>Powered by players</h3>
        <p>Create, remix, and share challenges that reflect your community.</p>
      </div>
      <div class="highlight-card">
        <h3>Moderation with care</h3>
        <p>Our team keeps the vibe safe, inclusive, and competition-ready.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

useHead(() => ({
  title: t('about.metaTitle'),
  meta: [
    {
      name: 'description',
      content: t('about.metaDescription'),
    },
  ],
}));
</script>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.about-hero {
  position: relative;
  overflow: hidden;
  padding: 6rem 1.5rem 5rem;
  display: flex;
  justify-content: center;
}

.about-hero__glow {
  display: none; /* Removed for flat design */
}

.about-hero__content {
  position: relative;
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  text-align: center;
  align-items: center;
}

.about-hero__pill {
  display: inline-flex;
  padding: 0.4rem 1.3rem;
  border-radius: 999px;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  color: var(--bulma-primary);
  letter-spacing: 0.12em;
  font-weight: 600;
  text-transform: uppercase;
}

.about-hero__title {
  font-size: clamp(2.5rem, 2vw + 2rem, 3.8rem);
  font-weight: 700;
  margin: 0;
}

.about-hero__subtitle {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  max-width: 48ch;
}

.about-hero__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.5rem;
  width: 100%;
}

.stat {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  border-radius: 18px;
  padding: 1.4rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.stat__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--bulma-primary);
}

.stat__label {
  font-size: 0.9rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.about-body {
  padding: 0 1.5rem;
  display: flex;
  justify-content: center;
}

.about-surface {
  width: min(960px, 100%);
  background-color: var(--color-bg-card);
  border-radius: 32px;
  border: 1px solid var(--color-border-base);
  padding: 3rem clamp(1.75rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  align-items: center;
  text-align: center;
}

.about-copy {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  line-height: 1.7;
}

.about-copy a {
  color: var(--bulma-link);
  text-decoration: underline;
}

.about-highlights {
  padding: 0 1.5rem 4rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  width: min(1100px, 100%);
  margin: 0 auto;
}

.highlight-card {
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 24px;
  padding: 2rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.highlight-card h3 {
  margin: 0;
  font-size: 1.3rem;
}

.highlight-card p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.fade-in {
  animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .about-page {
    gap: 3rem;
  }

  .about-hero {
    padding: 4.5rem 1rem 3.5rem;
  }

  .about-surface {
    padding: 2.5rem 1.5rem;
  }
}
</style>

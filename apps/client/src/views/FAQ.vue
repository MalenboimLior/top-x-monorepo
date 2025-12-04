<template>
  <div class="page-container faq-page">
    <section class="faq-hero">
      <div class="faq-hero__glow"></div>
      <div class="faq-hero__content">
        <p class="faq-hero__pill">FAQ</p>
        <h1 class="faq-hero__title">{{ t('faq.title') }}</h1>
        <p class="faq-hero__subtitle">{{ t('faq.subtitle') }}</p>
      </div>
    </section>

    <section class="faq-body">
      <div class="faq-surface">
        <p class="faq-intro" v-html="t('faq.intro')"></p>
        <div class="faq-list">
          <details v-for="(faq, index) in faqs" :key="index" class="faq-item">
            <summary>
              <h2>{{ faq.question }}</h2>
              <span class="faq-icon" aria-hidden="true">＋</span>
            </summary>
            <p v-html="faq.answer"></p>
          </details>
        </div>
        <div class="faq-cta">
          <CustomButton :label="t('faq.cta')" type="is-primary is-medium" @click="$router.push('/')" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const route = useRoute();
const t = (key: string) => localeStore.translate(key);
const baseUrl = 'https://top-x.co';
const canonicalUrl = `${baseUrl}${route.path}`;

const faqKeys = [
  { question: 'faq.items.login.question', answer: 'faq.items.login.answer' },
  { question: 'faq.items.security.question', answer: 'faq.items.security.answer' },
  { question: 'faq.items.permissions.question', answer: 'faq.items.permissions.answer' },
  { question: 'faq.items.permissionPrompt.question', answer: 'faq.items.permissionPrompt.answer' },
  { question: 'faq.items.dataProtection.question', answer: 'faq.items.dataProtection.answer' },
  { question: 'faq.items.free.question', answer: 'faq.items.free.answer' },
  { question: 'faq.items.unique.question', answer: 'faq.items.unique.answer' },
  { question: 'faq.items.powered.question', answer: 'faq.items.powered.answer' },
  { question: 'faq.items.vibeCoding.question', answer: 'faq.items.vibeCoding.answer' },
  { question: 'faq.items.games.question', answer: 'faq.items.games.answer' },
  { question: 'faq.items.howToPlay.question', answer: 'faq.items.howToPlay.answer' },
  { question: 'faq.items.sharing.question', answer: 'faq.items.sharing.answer' },
  { question: 'faq.items.shareWithFriends.question', answer: 'faq.items.shareWithFriends.answer' },
  { question: 'faq.items.noX.question', answer: 'faq.items.noX.answer' },
  { question: 'faq.items.follow.question', answer: 'faq.items.follow.answer' },
  { question: 'faq.items.future.question', answer: 'faq.items.future.answer' },
  { question: 'faq.items.whyReading.question', answer: 'faq.items.whyReading.answer' },
];

const faqs = computed(() =>
  faqKeys.map((item) => ({
    question: t(item.question),
    answer: t(item.answer),
  })),
);

useHead(() => ({
  title: t('faq.metaTitle'),
  meta: [
    {
      name: 'description',
      content: t('faq.metaDescription'),
    },
    // Open Graph tags
    {
      property: 'og:title',
      content: t('faq.metaTitle'),
    },
    {
      property: 'og:description',
      content: t('faq.metaDescription'),
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:url',
      content: canonicalUrl,
    },
    {
      property: 'og:site_name',
      content: 'TOP-X',
    },
    // Twitter Card tags
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: t('faq.metaTitle'),
    },
    {
      name: 'twitter:description',
      content: t('faq.metaDescription'),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl,
    },
  ],
}));
</script>

<style scoped>
.faq-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.faq-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.faq-hero__glow {
  display: none; /* Removed for flat design */
}

.faq-hero__content {
  position: relative;
  width: min(780px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.faq-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  color: var(--bulma-primary);
  font-weight: 600;
}

.faq-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.faq-hero__subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.faq-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.faq-surface {
  width: min(960px, 100%);
  background-color: var(--color-bg-card);
  border-radius: 32px;
  border: 1px solid var(--color-border-base);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.faq-intro {
  margin: 0;
  text-align: center;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  line-height: 1.7;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-item {
  background-color: var(--color-bg-secondary);
  border-radius: 22px;
  border: 1px solid var(--color-border-base);
  padding: 1.25rem 1.5rem;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.faq-item[open] {
  border-color: var(--color-border-primary);
  background-color: var(--color-bg-card-hover);
}

.faq-item summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item h2 {
  margin: 0;
  font-size: 1.2rem;
}

.faq-item p {
  margin: 1rem 0 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.faq-icon {
  font-size: 1.5rem;
  color: rgba(0, 232, 224, 0.8);
  transition: transform 0.3s ease;
}

.faq-item[open] .faq-icon {
  transform: rotate(45deg);
}

.faq-cta {
  display: flex;
  justify-content: center;
}

@media (max-width: 640px) {
  .faq-item {
    padding: 1rem 1.25rem;
  }

  .faq-item h2 {
    font-size: 1.05rem;
  }
}
</style>

<template>
  <div class="page-container terms-page">
    <section class="terms-hero">
      <div class="terms-hero__glow"></div>
      <div class="terms-hero__content">
        <span class="terms-hero__pill">{{ content.hero.pill }}</span>
        <h1 class="terms-hero__title">{{ content.hero.title }}</h1>
        <p class="terms-hero__subtitle">{{ content.hero.subtitle }}</p>
      </div>
    </section>

    <section class="terms-body">
      <div class="terms-surface">
        <article v-for="section in content.sections" :key="section.title" class="terms-section">
          <h2>{{ section.title }}</h2>
          <p>{{ section.body }}</p>
        </article>

        <div class="terms-cta">
          <CustomButton :label="content.cta.label" type="is-primary" @click="handleCtaClick" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useHead } from '@vueuse/head';
import { useRouter } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';

const router = useRouter();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const defaultContent = computed(() => ({
  hero: {
    pill: t('terms.hero.pill'),
    title: t('terms.hero.title'),
    subtitle: t('terms.hero.subtitle'),
  },
  sections: [
    {
      title: t('terms.sections.1.title'),
      body: t('terms.sections.1.body'),
    },
    {
      title: t('terms.sections.2.title'),
      body: t('terms.sections.2.body'),
    },
    {
      title: t('terms.sections.3.title'),
      body: t('terms.sections.3.body'),
    },
  ],
  cta: {
    label: t('terms.cta.label'),
    href: t('terms.cta.href'),
  },
}));

const seo = computed(() => ({
  title: t('terms.meta.title'),
  description: t('terms.meta.description'),
  keywords: t('terms.meta.keywords'),
}));

const content = defaultContent;

useHead(() => ({
  title: seo.value.title,
  meta: [
    {
      name: 'description',
      content: seo.value.description,
    },
    seo.value.keywords
      ? {
          name: 'keywords',
          content: seo.value.keywords,
        }
      : undefined,
  ].filter(Boolean) as { name: string; content: string }[],
}));

function handleCtaClick() {
  const href = content.value.cta.href;
  if (!href) {
    void router.push('/');
    return;
  }
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    window.location.href = href;
    return;
  }
  void router.push(href);
}
</script>

<style scoped>
.terms-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.terms-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.terms-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 25% 30%, rgba(0, 232, 224, 0.24), transparent 60%),
    radial-gradient(circle at 70% 25%, rgba(196, 255, 0, 0.16), transparent 60%);
  pointer-events: none;
}

.terms-hero__content {
  position: relative;
  width: min(760px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.terms-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.terms-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.terms-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.1rem;
}

.terms-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.terms-surface {
  width: min(960px, 100%);
  background: rgba(12, 12, 12, 0.82);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
}

.terms-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.terms-section h2 {
  margin: 0;
  font-size: 1.7rem;
}

.terms-section p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
}

.terms-cta {
  display: flex;
  justify-content: center;
}

@media (max-width: 640px) {
  .terms-section h2 {
    font-size: 1.4rem;
  }
}
</style>

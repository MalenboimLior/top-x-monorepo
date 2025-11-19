<template>
  <div class="page-container contact-page">
    <section class="contact-hero">
      <div class="contact-hero__glow"></div>
      <div class="contact-hero__content">
        <span class="contact-hero__pill">{{ content.hero.pill }}</span>
        <h1 class="contact-hero__title">{{ content.hero.title }}</h1>
        <p class="contact-hero__subtitle">{{ content.hero.subtitle }}</p>
      </div>
    </section>

    <section class="contact-body">
      <div class="contact-card">
        <div class="contact-card__section">
          <h2>{{ content.sections[0].title }}</h2>
          <p>{{ content.sections[0].body }}</p>
          <a :href="content.sections[0].linkHref" class="contact-link">{{ content.sections[0].linkLabel }}</a>
        </div>
        <div class="contact-card__divider"></div>
        <div class="contact-card__section">
          <h2>{{ content.sections[1].title }}</h2>
          <p>{{ content.sections[1].body }}</p>
          <a :href="content.sections[1].linkHref" target="_blank" rel="noopener" class="contact-link">
            <font-awesome-icon :icon="['fab', 'x-twitter']" class="contact-link__icon" />
            {{ content.sections[1].linkLabel }}
          </a>
        </div>
        <div class="contact-card__cta">
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

const localeStore = useLocaleStore();
const router = useRouter();

const t = (key: string) => localeStore.translate(key);

const defaultContent = computed(() => ({
  hero: {
    pill: t('contact.hero.pill'),
    title: t('contact.hero.title'),
    subtitle: t('contact.hero.subtitle'),
  },
  sections: [
    {
      title: t('contact.sections.talk.title'),
      body: t('contact.sections.talk.body'),
      linkLabel: t('contact.sections.talk.linkLabel'),
      linkHref: t('contact.sections.talk.linkHref'),
    },
    {
      title: t('contact.sections.follow.title'),
      body: t('contact.sections.follow.body'),
      linkLabel: t('contact.sections.follow.linkLabel'),
      linkHref: t('contact.sections.follow.linkHref'),
    },
  ],
  cta: {
    label: t('contact.cta.label'),
    href: t('contact.cta.href'),
  },
}));

const seo = computed(() => ({
  title: t('contact.meta.title'),
  description: t('contact.meta.description'),
  keywords: t('contact.meta.keywords'),
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

  if (href.startsWith('http')) {
    window.location.href = href;
    return;
  }

  if (href.startsWith('mailto:')) {
    window.location.href = href;
    return;
  }

  void router.push(href);
}
</script>

<style scoped>
.contact-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.contact-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.contact-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 30%, rgba(0, 232, 224, 0.25), transparent 60%);
  pointer-events: none;
  opacity: 0.9;
}

.contact-hero__content {
  position: relative;
  width: min(720px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.contact-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.contact-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.contact-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.1rem;
  line-height: 1.7;
}

.contact-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.contact-card {
  width: min(800px, 100%);
  background: rgba(10, 10, 10, 0.75);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: clamp(2rem, 4vw, 3rem);
  display: grid;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  position: relative;
}

.contact-card__section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: center;
}

.contact-card__section h2 {
  margin: 0;
  font-size: 1.6rem;
}

.contact-card__section p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.6;
}

.contact-card__divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 232, 224, 0.35), transparent);
}

.contact-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--bulma-primary);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.contact-link:hover,
.contact-link:focus {
  color: rgba(196, 255, 0, 0.85);
}

.contact-link__icon {
  font-size: 1.2rem;
}

.contact-card__cta {
  display: flex;
  justify-content: center;
}

@media (max-width: 640px) {
  .contact-card {
    padding: 1.75rem;
  }

  .contact-card__divider {
    margin: 0 auto;
    width: 80%;
  }
}
</style>

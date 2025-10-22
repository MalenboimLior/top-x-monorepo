<template>
  <div class="about-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">{{ t('about.title') }}</h1>
          <p class="subtitle is-4 has-text-light">
            {{ t('about.subtitle') }}
          </p>
        </div>
      </div>
    </section>

    <section class="section fade-in">
      <div class="container">
        <div class="content has-text-centered">
          <p class="is-size-5">{{ t('about.paragraph1') }}</p>
          <p class="is-size-5">{{ t('about.paragraph2') }}</p>
          <p class="is-size-5" v-html="t('about.paragraph3')"></p>
          <p class="is-size-5" v-html="t('about.paragraph4')"></p>
          <CustomButton
            type="is-primary is-large mt-5"
            :label="t('about.cta')"
            @click="$router.push('/')"
          />
        </div>
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
  background-color: #000000;
  min-height: 100vh;
  color: #ffffff;
}

.hero.is-dark {
  background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('@/assets/background-pattern.png');
  background-size: cover;
}

.section {
  padding: 3rem 1.5rem;
}

.content p {
  margin-bottom: 1.5rem;
  line-height: 1.6;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.content a {
  color: #00e8e0;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.content a:hover {
  color: #ffffff;
}

.fade-in {
  animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .hero-body {
    padding: 2rem 1rem;
  }
  .title.is-1 {
    font-size: 2.5rem !important;
  }
  .subtitle.is-4 {
    font-size: 1.25rem !important;
  }
  .content p {
    font-size: 1rem;
  }
}
</style>

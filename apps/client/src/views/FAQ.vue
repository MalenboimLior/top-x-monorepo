
<template>
  <div class="faq-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">{{ t('faq.title') }}</h1>
          <p class="subtitle is-4 has-text-light">
            {{ t('faq.subtitle') }}
          </p>
        </div>
      </div>
    </section>

    <section class="section fade-in">
      <div class="container">
        <div class="content">
          <p class="is-size-5 has-text-light has-text-centered mb-6" v-html="t('faq.intro')"></p>
          <div v-for="(faq, index) in faqs" :key="index" class="faq-item mb-5 box dark-box">
            <h2 class="title is-4 has-text-white">{{ faq.question }}</h2>
            <p class="is-size-5 has-text-light" v-html="faq.answer"></p>
          </div>
          <CustomButton
            :label="t('faq.cta')"
            type="is-primary is-large mt-5"
            @click="$router.push('/')"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

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

const faqs = computed(() => faqKeys.map((item) => ({
  question: t(item.question),
  answer: t(item.answer),
})));

useHead(() => ({
  title: t('faq.metaTitle'),
  meta: [
    {
      name: 'description',
      content: t('faq.metaDescription'),
    },
  ],
}));
</script>

<style scoped>
.faq-page {
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

.faq-item {
  border-radius: 8px;
  padding: 1.5rem;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.faq-item:hover {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 12px rgba(0, 232, 224, 0.1);
}

.dark-box {
  background-color: #121212;
  border: 1px solid #333;
}

.content p {
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
  .title.is-4 {
    font-size: 1.5rem !important;
  }
  .faq-item {
    padding: 1rem;
  }
}
</style>

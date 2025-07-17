<template>
  <div class="faq-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">Frequently Asked Questions</h1>
          <p class="subtitle is-4 has-text-light">
            Quick answers to common questions about TOP-X.
          </p>
        </div>
      </div>
    </section>

    <section class="section fade-in">
      <div class="container">
        <div class="content">
          <div v-for="(faq, index) in faqs" :key="index" class="faq-item mb-5">
            <h2 class="title is-4 has-text-white">{{ faq.question }}</h2>
            <p class="is-size-5 has-text-light">{{ faq.answer }}</p>
          </div>
          <CustomButton
            label="Back to Home"
            type="is-primary is-large mt-5"
            @click="$router.push('/')"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

export default defineComponent({
  name: 'FAQPage',
  components: {
    CustomButton,
  },
  setup() {
    useHead({
      title: 'TOP-X FAQ',
      meta: [
        { name: 'description', content: 'Answers to frequently asked questions about TOP-X, including login, privacy, and games.' },
      ],
    });
  },
  data() {
    return {
      faqs: [
        {
          question: 'Why log in to TOP-X?',
          answer:
            'Logging in unlocks full features like saving progress, leaderboards, and rival searches. It connects you to the community while keeping your data secure.',
        },
        {
          question: 'Is logging in with X secure?',
          answer:
            'Yes! We use X\'s secure OAuth with minimal permissions. Your data stays private, and we can\'t access DMs or post for you.',
        },
        {
          question: 'What X permissions does TOP-X need?',
          answer:
            'Just basics: Reading your public profile and posts. No posting, no private data—privacy first!',
        },
        {
          question: 'Is TOP-X free?',
          answer:
            'Totally free! All games and features are accessible without any costs. Jump in and enjoy!',
        },
        {
          question: 'Who powers TOP-X?',
          answer:
            'Grok from xAI built 99% of it—code, games, content, and more. We add the human touch for perfection!',
        },
        {
          question: 'What games are available?',
          answer:
            'Start with Trivia and more mini-games coming soon. Compete socially with leaderboards and friends.',
        },
        {
          question: 'How is my data protected?',
          answer:
            'We use Firebase for secure storage, minimal collection, and compliance with privacy laws. You control your info.',
        },
        {
          question: 'What\'s next for TOP-X?',
          answer:
            'Grok is innovating! Expect new games, enhanced social tools, and exciting updates. Follow us on X for news.',
        },
      ],
    };
  },
});
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
  border-bottom: 1px solid #333;
  padding-bottom: 1.5rem;
  transition: background 0.3s ease;
}

.faq-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.content p {
  line-height: 1.6;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
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
}
</style>
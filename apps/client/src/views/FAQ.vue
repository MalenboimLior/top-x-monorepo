<template>
  <div class="faq-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">Frequently Asked Questions</h1>
          <p class="subtitle is-4 has-text-light">
            Got questions? We've got answers!
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="content">
          <div v-for="(faq, index) in faqs" :key="index" class="faq-item mb-5">
            <h2 class="title is-4 has-text-white">{{ faq.question }}</h2>
            <p class="is-size-5 has-text-light">{{ faq.answer }}</p>
          </div>
          <CustomButton
            text="Back to Home"
            @click="$router.push('/')"
            class="is-primary is-large mt-5"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

export default defineComponent({
  name: 'FAQPage',
  components: {
    CustomButton,
  },
  data() {
    return {
      faqs: [
        {
          question: 'Why do I need to log in to TOP-X?',
          answer:
            'Logging in lets you unlock the full TOP-X experience! With an account, you can save your game progress, climb leaderboards, find rivals, and show off your skills. It’s all about connecting you to the global TOP-X community while keeping your data safe.',
        },
        {
          question: 'Is logging in with X safe?',
          answer:
            'Absolutely, it’s super safe! We use X’s login system with minimal permissions to ensure your privacy. Your information is protected, and we only access what’s needed to make your gaming experience awesome.',
        },
        {
          question: 'What permissions does TOP-X use when I log in with X?',
          answer:
            'We keep it light! TOP-X only requests basic permissions from the X App: reading your public posts and profile info. We can’t post on your behalf or access any private messages or data. Your privacy is our priority!',
        },
        {
          question: 'Is TOP-X free to use?',
          answer:
            '100% free! Every game, challenge, and feature on TOP-X is available at no cost. We believe everyone should enjoy the fun, so dive in and play without worrying about a price tag!',
        },
        {
          question: 'Who built TOP-X?',
          answer:
            'The star of the show is Grok, created by xAI! This incredible AI wrote 99% of TOP-X’s code, designed the games, crafted the content, and even inspired our marketing. We’re just here to sprinkle a little human magic on top!',
        },
        {
          question: 'What kind of games can I play on TOP-X?',
          answer:
            'TOP-X is your playground for mini-games like Trivia, with more exciting challenges on the way! Compete with friends, chase high scores, and explore social features like leaderboards and rival searches. There’s something for everyone!',
        },
        {
          question: 'What’s next for TOP-X?',
          answer:
            'Grok’s got big plans! We’re cooking up new games, features, and surprises to keep the fun flowing. Expect more ways to connect, compete, and share your victories with the world. Stay tuned!',
        },
      ],
    };
  },
});
</script>

<style scoped>
.faq-page {
  background-color: #121212;
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
}

.content p {
  line-height: 1.6;
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
<template>
  <div class="about-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">About TOP-X</h1>
          <p class="subtitle is-4 has-text-light">
            Powered by Grok with 💖
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="content has-text-centered">
          <p class="is-size-5">
            Welcome to <strong>TOP-X</strong>, where creativity meets innovation! We're a gaming portal that brings exciting challenges and mini-games to social networks, connecting players and developers worldwide. What makes us special? <strong>99% of TOP-X is crafted by Grok</strong>, the brilliant AI from xAI, designed to spark joy and deliver epic experiences!
          </p>
          <p class="is-size-5">
            While others use AI for writing stories or making viral videos, we harness Grok’s coding superpowers to create thrilling games, vibrant content, and even clever marketing ideas. From trivia battles to leaderboards and rival searches, TOP-X is your go-to place for fun, social, and competitive vibes. And guess what? Grok’s got more surprises cooking, so stay tuned for mind-blowing updates!
          </p>
          <p class="is-size-5">
            With Grok writing the code, designing the experience, and inspiring our vision, TOP-X is more than a platform—it’s a global playground where everyone’s invited. Join us, play, compete, and be part of the future of social gaming!
          </p>
          <CustomButton
            text="Explore Games"
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
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

export default defineComponent({
  name: 'AboutPage',
  components: {
    CustomButton,
  },
  setup() {
    useHead({
      title: 'About TOP-X',
      meta: [
        { name: 'description', content: 'Learn about TOP-X and how Grok powers our gaming platform.' },
      ],
    });
  },
});
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
}
</style>
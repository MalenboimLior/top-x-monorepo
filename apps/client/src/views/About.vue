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

    <section class="section fade-in">
      <div class="container">
        <div class="content has-text-centered">
          <p class="is-size-5">
            Welcome to <strong>TOP-X</strong>, the ultimate gaming portal where fun meets innovation on social networks! Connect with players and developers worldwide through exciting mini-games like Trivia, user profiles, leaderboards, and rival searches.
          </p>
          <p class="is-size-5">
            What sets us apart? <strong>99% of TOP-X is built by Grok</strong>, xAI's genius AI, handling everything from code to content and marketing ideas. While others use AI for simple tasks, we leverage Grok for immersive, joyful experiences.
          </p>
          <p class="is-size-5">
            Join the playground: Play, compete, share victories, and watch for upcoming features. TOP-X is your gateway to the future of social gaming!
          </p>
          <CustomButton
            type="is-primary is-large mt-5"
            label="Explore Games"
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
  name: 'AboutPage',
  components: {
    CustomButton,
  },
  setup() {
    useHead({
      title: 'About TOP-X',
      meta: [
        { name: 'description', content: 'Discover TOP-X, the Grok-powered gaming platform for social fun and competition.' },
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
}
</style>
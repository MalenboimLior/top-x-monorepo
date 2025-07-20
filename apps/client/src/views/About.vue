<template>
  <div class="about-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">About TOP-X</h1>
          <p class="subtitle is-4 has-text-light">
            Rise to the Challenge! ⚔️
          </p>
        </div>
      </div>
    </section>

    <section class="section fade-in">
      <div class="container">
        <div class="content has-text-centered">
          <p class="is-size-5">
            TOP-X is your ultimate arena for ego-bruising games, rankings, and viral showdowns. Think pyramids of glory (who's on top?), trivia takedowns, quizzes that test your vibe, and custom challenges where U vs X in real-time rivalries. Build, compete, rank, share - and trash-talk your way to the feed's throne. 📈🚀
          </p>
          <p class="is-size-5">
            Crafted 99% by Grok's genius 🤖 (yep, that xAI powerhouse), with human vibe-coding for that extra spark 💖. We're all about trends, tech, and turning scrolls into battles - weekly drops to keep you hooked.
          </p>
          <p class="is-size-5">
            Ready to rise? Sign in with X for full unlocks: save your wins, spy on friends' picks, climb leaderboards, and join our VIP crew for early access & input. Follow <a href="https://x.com/topxapp" target="_blank" rel="noopener noreferrer" class="has-text-primary">@topxapp</a> for drops, RTs, and glory shots. Who's topping yours? Ready to top them all? Dive into a challenge now! 👉 <a href="https://top-x.co/challenges" class="has-text-primary">top-x.co/challenges</a>.
          </p>
          <p class="is-size-5">
            Got feedback, ideas or collabs? Hit us up: <a href="mailto:contact@top-x.co" class="has-text-primary">contact@top-x.co</a> or DM <a href="https://x.com/topxapp" target="_blank" rel="noopener noreferrer" class="has-text-primary">@topxapp</a>. Let's build the next big thing - together! 🏆
          </p>
          <CustomButton
            type="is-primary is-large mt-5"
            label="Dive into Challenges"
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
        { name: 'description', content: 'Rise to the challenge at TOP-X, the Grok-powered arena for games, rankings, and viral showdowns.' },
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


<template>
  <div class="faq-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">Frequently Asked Questions</h1>
          <p class="subtitle is-4 has-text-light">
            Your TOP-X Quick Hits 🚀
          </p>
        </div>
      </div>
    </section>

    <section class="section fade-in">
      <div class="container">
        <div class="content">
          <p class="is-size-5 has-text-light has-text-centered mb-6">
            We've got answers to crush your doubts - ego-bruising style. U vs X? Dive in, play on, and claim the feed. Questions not covered? Hit us at <a href="mailto:contact@top-x.co" class="has-text-primary">contact@top-x.co</a>. Who's topping yours? Let's find out! 📈⚔️
          </p>
          <div v-for="(faq, index) in faqs" :key="index" class="faq-item mb-5 box dark-box">
            <h2 class="title is-4 has-text-white">{{ faq.question }}</h2>
            <p class="is-size-5 has-text-light" v-html="faq.answer"></p>
          </div>
          <CustomButton
            label="Dive into Challenges"
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
        { name: 'description', content: 'Quick hits on TOP-X: Login, privacy, games, and more ego-bruising answers.' },
      ],
    });
  },
  data() {
    return {
      faqs: [
        {
          question: 'Why log in to TOP-X?',
          answer:
            'Sign in to unleash the full glory: save your past plays, results & picks, climb leaderboards, spy on friends\' picks, and trash-talk rivals. Without it? Fun previews only - no community showdowns or ego boosts. Log in & rise to the challenge! 🔑',
        },
        {
          question: 'Is logging in with X secure?',
          answer:
            'Absolutely! We use X\'s ironclad OAuth - minimal access, max privacy. No peeking at DMs, no posting on your behalf. Your data\'s locked down tighter than a vault in Fort Knox. 🔒💪',
        },
        {
          question: 'What X permissions does TOP-X need?',
          answer:
            'Just the basics: your public profile (username + pic) for personalization - to prevent fakes and duplicate votes. We skip the rest - no private posts, no follows lists. Privacy first, ego-bruises second! 📋',
        },
        {
          question: 'Why does X ask for several permissions?',
          answer:
            'X\'s default prompt is overkill - it\'s the bare minimum they allow for any app. Stuff like "protected posts" (locked accounts) or "who you follow/block"? We ignore it all. We only snag your username + pic - nothing else touches your feed. Promise: No meddling, no posting, just pure U vs X vibes. Chill & connect! 😎',
        },
        {
          question: 'How is my data protected?',
          answer:
            'Firebase secures your info with top-tier encryption - minimal collection (just what you share), full privacy compliance. You control it all; we don\'t sell or snoop. Ego-bruises? Yes. Data drama? Never. 🔒🛡️',
        },
        {
          question: 'Is TOP-X free?',
          answer:
            'Totally free! All challenges are free. Jump in, play, compete, rank, flex, and top them all without dropping a dime. 🆓🏆',
        },
        {
          question: 'What makes TOP-X unique?',
          answer:
            'We\'re Grok-powered (99% xAI magic 🤖) + human vibe-coded 💖 for that unbeatable edge. We ride trends like pros - weekly drops tailored to X\'s hottest buzz. Fast, techy, and ego-bruising: Pyramids for GOAT debates, trivia smackdowns, and viral rivalries. No stale games - fresh battles every week! ⚡📈',
        },
        {
          question: 'What\'s the deal with "Powered by Grok 99%"?',
          answer:
            'Grok (xAI\'s powerhouse) built 99% of TOP-X: code, games, content, even marketing sparks. It\'s like having an AI wizard on speed-dial for trend-riding glory. Humans add the final 1% vibe-code for that human spark. Grok crunches, we perfect the punch! 🤖🔥',
        },
        {
          question: 'What\'s vibe-coding?',
          answer:
            'Vibe-coding is our secret sauce: Humans tweaking Grok\'s 99% AI output for that irresistible feel - cheeky, competitive, trend-connected. It\'s not just code; it\'s ego-bruising energy, trash-talk tweaks, and U vs X flair. Grok crunches the tech; we code the vibes. 💖⚔️',
        },
        {
          question: 'What games & challenges are available?',
          answer:
            'Pyramids of glory (rank GOATs like football legends or prez rivalries), trivia takedowns (test your smarts vs the feed), quizzes that bruise egos, and many more mini-games, ego-busters and showdowns. More dropping weekly. Rise, rival, conquer! 🎮📊',
        },
        {
          question: 'How do I play & what\'s recommended?',
          answer:
            'Easy: Pick a challenge (pyramids, trivia, quizzes or other), build/rank/quiz/play away, then share for trash-talk gold. Start with a pyramid - stack your GOATs, log in for leaderboards, add frenemies for friends/rival peeks. Pro tip: Share everywhere (X, WhatsApp, Facebook, Instagram) to rally your crew. Top them all! 🎯',
        },
        {
          question: 'Can I share my pyramids, results, or game stuff?',
          answer:
            'Heck yeah - we encourage it! Grab the image, paste our pre-copied text, and flex on X or anywhere. It rallies more players, unlocks community results, and lets you spy who\'s topping yours. Win-win ego glory! 📸🏆',
        },
        {
          question: 'How do I share with friends?',
          answer:
            'Easy ego-flex: Hit the share button after a challenge - it auto-downloads your image (pyramid, trivia score, etc.) and copies custom text. Paste into X, WhatsApp, or anywhere - tag your crew, trash-talk, and rally them to top yours. Pre-loaded with our URL for viral vibes. Share & top \'em all! 📸👥',
        },
        {
          question: 'If I don\'t have X, what can I do?',
          answer:
            'Open an X account <a href="https://x.com/signup" target="_blank" rel="noopener noreferrer" class="has-text-primary">here</a> - Seriously, how do you live without it? 😜 It\'s just two seconds! Or jump in without logging in - half the features (like results, leaderboards, frenemies) won\'t unlock, but you can still play challenges and share images on other platforms (WhatsApp, Facebook, etc.). Ego-bruise lite mode! 📱',
        },
        {
          question: 'Why follow @topxapp?',
          answer:
            'For the inside scoop: Weekly drops, RTs of your wins, glory shots (spotlights & scores), and trend alerts. It\'s your feed\'s ego-boost HQ - follow <a href="https://x.com/topxapp" target="_blank" rel="noopener noreferrer" class="has-text-primary">@topxapp</a> & stay ahead of the rivalries! 👀📌',
        },
        {
          question: 'What\'s next for TOP-X?',
          answer:
            'Grok 4\'s dropping epic upgrades soon. Weekly challenges synced to X storms: More pyramids, polls, mini games and challenges at the speed of a keystroke. Shaped by your feedback - join the VIP crew for input! We\'ve got tons more surprises in store, but Grok recommends keeping mum for now. Stay tuned & top the future! 🚀📈',
        },
        {
          question: 'Why am I still reading this FAQ instead of logging in & playing?',
          answer:
            'Probably overthinking the ego-bruise... or scared you won\'t top \'em all? 😏 Nah, you\'re ready - take the leap, sign in securely, and claim the throne. U vs X starts now! Dive into challenges 👉 <a href="https://top-x.co/challenges" class="has-text-primary">top-x.co/challenges</a>. Who\'s on top? You tell us! ⚔️',
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

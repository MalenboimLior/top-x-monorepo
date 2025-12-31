<template>
  <div class="page-container how-it-works-page" :dir="localeStore.direction">
    <section class="how-it-works-hero">
      <div class="how-it-works-hero__content">
        <p class="how-it-works-hero__pill">{{ t('howitworks.hero.pill') }}</p>
        <h1 class="how-it-works-hero__title">{{ t('howitworks.hero.title') }}</h1>
        <p class="how-it-works-hero__subtitle">
          {{ t('howitworks.hero.subtitle') }}
        </p>
      </div>
    </section>

    <section class="how-it-works-body fade-in">
      <div class="how-it-works-surface">
        <div class="how-it-works-content">
          <p class="how-it-works-intro">
            {{ t('howitworks.intro') }}
          </p>

          <!-- Playing Games -->
          <div class="how-it-works-section">
            <h2>{{ t('howitworks.section1.title') }}</h2>

            <h3>{{ t('howitworks.section1.discovering.title') }}</h3>
            <p>{{ t('howitworks.section1.discovering.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section1.discovering.featured') }}</li>
              <li>{{ t('howitworks.section1.discovering.hot') }}</li>
              <li>{{ t('howitworks.section1.discovering.official') }}</li>
              <li>{{ t('howitworks.section1.discovering.community') }}</li>
              <li>{{ t('howitworks.section1.discovering.search') }}</li>
            </ul>

            <h3>{{ t('howitworks.section1.types.title') }}</h3>
            <ul>
              <li>{{ t('howitworks.section1.types.pyramid') }}</li>
              <li>{{ t('howitworks.section1.types.trivia') }}</li>
              <li>{{ t('howitworks.section1.types.quiz') }}</li>
              <li>{{ t('howitworks.section1.types.zone') }}</li>
              <li>{{ t('howitworks.section1.types.daily') }}</li>
            </ul>

            <h3>{{ t('howitworks.section1.playing.title') }}</h3>
            <p>{{ t('howitworks.section1.playing.content') }}</p>
            <ol>
              <li>{{ t('howitworks.section1.playing.step1') }}</li>
              <li>{{ t('howitworks.section1.playing.step2') }}</li>
              <li>{{ t('howitworks.section1.playing.step3') }}</li>
              <li>{{ t('howitworks.section1.playing.step4') }}</li>
              <li>{{ t('howitworks.section1.playing.step5') }}</li>
            </ol>
          </div>

          <!-- Competing & Leaderboards -->
          <div class="how-it-works-section">
            <h2>{{ t('howitworks.section2.title') }}</h2>

            <h3>{{ t('howitworks.section2.understanding.title') }}</h3>
            <p>{{ t('howitworks.section2.understanding.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section2.understanding.alltime') }}</li>
              <li>{{ t('howitworks.section2.understanding.daily') }}</li>
              <li>{{ t('howitworks.section2.understanding.friends') }}</li>
              <li>{{ t('howitworks.section2.understanding.realtime') }}</li>
            </ul>

            <h3>{{ t('howitworks.section2.climbing.title') }}</h3>
            <p>{{ t('howitworks.section2.climbing.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section2.climbing.practice') }}</li>
              <li>{{ t('howitworks.section2.climbing.mechanics') }}</li>
              <li>{{ t('howitworks.section2.climbing.players') }}</li>
              <li>{{ t('howitworks.section2.climbing.daily') }}</li>
            </ul>

            <h3>{{ t('howitworks.section2.friends.title') }}</h3>
            <p>{{ t('howitworks.section2.friends.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section2.friends.search') }}</li>
              <li>{{ t('howitworks.section2.friends.follow') }}</li>
              <li>{{ t('howitworks.section2.friends.compare') }}</li>
              <li>{{ t('howitworks.section2.friends.challenge') }}</li>
            </ul>
          </div>

          <!-- Creating Games -->
          <div class="how-it-works-section">
            <h2>{{ t('howitworks.section3.title') }}</h2>

            <h3>{{ t('howitworks.section3.starting.title') }}</h3>
            <p>{{ t('howitworks.section3.starting.content') }}</p>
            <ol>
              <li>{{ t('howitworks.section3.starting.step1') }}</li>
              <li>{{ t('howitworks.section3.starting.step2') }}</li>
              <li>{{ t('howitworks.section3.starting.step3') }}</li>
              <li>{{ t('howitworks.section3.starting.step4') }}</li>
              <li>{{ t('howitworks.section3.starting.step5') }}</li>
            </ol>

            <h3>{{ t('howitworks.section3.builder.title') }}</h3>
            <p>{{ t('howitworks.section3.builder.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section3.builder.contentCreation') }}</li>
              <li>{{ t('howitworks.section3.builder.visual') }}</li>
              <li>{{ t('howitworks.section3.builder.mechanics') }}</li>
              <li>{{ t('howitworks.section3.builder.settings') }}</li>
              <li>{{ t('howitworks.section3.builder.daily') }}</li>
            </ul>

            <h3>{{ t('howitworks.section3.practices.title') }}</h3>
            <ul>
              <li>{{ t('howitworks.section3.practices.original') }}</li>
              <li>{{ t('howitworks.section3.practices.instructions') }}</li>
              <li>{{ t('howitworks.section3.practices.difficulty') }}</li>
              <li>{{ t('howitworks.section3.practices.engaging') }}</li>
              <li>{{ t('howitworks.section3.practices.updates') }}</li>
            </ul>
          </div>

          <!-- Sharing & Social Features -->
          <div class="how-it-works-section">
            <h2>{{ t('howitworks.section4.title') }}</h2>

            <h3>{{ t('howitworks.section4.sharing.title') }}</h3>
            <p>{{ t('howitworks.section4.sharing.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section4.sharing.automatic') }}</li>
              <li>{{ t('howitworks.section4.sharing.platforms') }}</li>
              <li>{{ t('howitworks.section4.sharing.challenge') }}</li>
              <li>{{ t('howitworks.section4.sharing.viral') }}</li>
            </ul>

            <h3>{{ t('howitworks.section4.community.title') }}</h3>
            <ul>
              <li>{{ t('howitworks.section4.community.follow') }}</li>
              <li>{{ t('howitworks.section4.community.engage') }}</li>
              <li>{{ t('howitworks.section4.community.shareable') }}</li>
              <li>{{ t('howitworks.section4.community.feedback') }}</li>
            </ul>
          </div>

          <!-- Account & Profile -->
          <div class="how-it-works-section">
            <h2>{{ t('howitworks.section5.title') }}</h2>

            <h3>{{ t('howitworks.section5.login.title') }}</h3>
            <p>{{ t('howitworks.section5.login.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section5.login.xauth') }}</li>
              <li>{{ t('howitworks.section5.login.permissions') }}</li>
              <li>{{ t('howitworks.section5.login.storage') }}</li>
            </ul>

            <h3>{{ t('howitworks.section5.profile.title') }}</h3>
            <p>{{ t('howitworks.section5.profile.content') }}</p>
            <ul>
              <li>{{ t('howitworks.section5.profile.history') }}</li>
              <li>{{ t('howitworks.section5.profile.statistics') }}</li>
              <li>{{ t('howitworks.section5.profile.favorites') }}</li>
              <li>{{ t('howitworks.section5.profile.following') }}</li>
              <li>{{ t('howitworks.section5.profile.created') }}</li>
            </ul>
          </div>

          <!-- Tips & Strategies -->
          <div class="how-it-works-section highlight">
            <h2>{{ t('howitworks.section6.title') }}</h2>

            <h3>{{ t('howitworks.section6.players.title') }}</h3>
            <ul>
              <li>{{ t('howitworks.section6.players.featured') }}</li>
              <li>{{ t('howitworks.section6.players.practice') }}</li>
              <li>{{ t('howitworks.section6.players.daily') }}</li>
              <li>{{ t('howitworks.section6.players.follow') }}</li>
              <li>{{ t('howitworks.section6.players.share') }}</li>
            </ul>

            <h3>{{ t('howitworks.section6.creators.title') }}</h3>
            <ul>
              <li>{{ t('howitworks.section6.creators.simple') }}</li>
              <li>{{ t('howitworks.section6.creators.test') }}</li>
              <li>{{ t('howitworks.section6.creators.engage') }}</li>
              <li>{{ t('howitworks.section6.creators.promote') }}</li>
              <li>{{ t('howitworks.section6.creators.daily') }}</li>
            </ul>
          </div>

          <!-- Getting Help -->
          <div class="how-it-works-section">
            <h2>{{ t('howitworks.section7.title') }}</h2>
            <p>{{ t('howitworks.section7.content') }}</p>
            <ul>
              <li><strong>FAQ Page:</strong> Check our <router-link to="/faq" class="has-text-primary">FAQ page</router-link> for answers to common questions.</li>
              <li><strong>Contact Support:</strong> Email us at <a href="mailto:contact@top-x.co" class="has-text-primary">contact@top-x.co</a> for support, questions, or feedback.</li>
              <li><strong>Follow Updates:</strong> Follow <a href="https://x.com/topxapp" target="_blank" rel="noopener noreferrer" class="has-text-primary">@topxapp</a> on X for platform updates, new features, and community highlights.</li>
              <li><strong>Community Guidelines:</strong> Review our <router-link to="/guidelines" class="has-text-primary">Community Guidelines</router-link> to understand platform rules and expectations.</li>
            </ul>
          </div>
        </div>

        <div class="how-it-works-footer">
          <CustomButton
            type="is-primary is-large"
            :label="t('howitworks.button')"
            @click="$router.push('/')"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import { useLocaleStore } from '@/stores/locale';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const route = useRoute();
const baseUrl = 'https://top-x.co';
const canonicalUrl = `${baseUrl}${route.path}`;

useHead(() => ({
  title: `${t('howitworks.hero.title')} - TOP-X`,
  meta: [
    {
      name: 'description',
      content: t('howitworks.hero.subtitle'),
    },
    {
      name: 'keywords',
      content: 'TOP-X guide, how to play, game creation, leaderboards, competition',
    },
    // Open Graph tags
    {
      property: 'og:title',
      content: `${t('howitworks.hero.title')} - TOP-X`,
    },
    {
      property: 'og:description',
      content: t('howitworks.hero.subtitle'),
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:url',
      content: canonicalUrl,
    },
    {
      property: 'og:site_name',
      content: 'TOP-X',
    },
    // Twitter Card tags
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: `${t('howitworks.hero.title')} - TOP-X`,
    },
    {
      name: 'twitter:description',
      content: t('howitworks.hero.subtitle'),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl,
    },
  ],
}));

// Ensure prerender-ready fires after content is fully rendered
onMounted(() => {
  nextTick(() => {
    if (import.meta.env.PROD && (window as any).__PRERENDER_INJECTED) {
      setTimeout(() => {
        document.dispatchEvent(new Event('prerender-ready'));
      }, 500);
    }
  });
});
</script>

<style scoped>
.how-it-works-page {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

/* RTL Support */
[dir="rtl"] .how-it-works-page {
  text-align: right;
}

[dir="ltr"] .how-it-works-page {
  text-align: left;
}

.how-it-works-hero {
  position: relative;
  overflow: hidden;
  padding: 6rem 1.5rem 5rem;
  display: flex;
  justify-content: center;
}

.how-it-works-hero__content {
  position: relative;
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  align-items: center;
}

.how-it-works-hero__pill {
  display: inline-flex;
  padding: 0.4rem 1.3rem;
  border-radius: 999px;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  color: var(--bulma-primary);
  letter-spacing: 0.12em;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
}

.how-it-works-hero__title {
  font-size: clamp(2.5rem, 2vw + 2rem, 3.8rem);
  font-weight: 700;
  margin: 0;
}

.how-it-works-hero__subtitle {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  max-width: 48ch;
}

.how-it-works-body {
  padding: 0 1.5rem 4rem;
  display: flex;
  justify-content: center;
}

.how-it-works-surface {
  width: min(960px, 100%);
  background-color: var(--color-bg-card);
  border-radius: 32px;
  border: 1px solid var(--color-border-base);
  padding: 3rem clamp(1.75rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.how-it-works-content {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  line-height: 1.7;
}

.how-it-works-intro {
  font-size: 1.05rem;
  color: var(--color-text-secondary);
  padding: 1.5rem;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 16px;
  margin: 0;
}

.how-it-works-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.how-it-works-section h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-border-base);
}

.how-it-works-section h3 {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: var(--color-text-primary);
}

.how-it-works-section p {
  margin: 0 0 1rem 0;
}

.how-it-works-section ul,
.how-it-works-section ol {
  margin: 0 0 1rem 1.5rem;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* RTL adjustments for lists */
[dir="rtl"] .how-it-works-section ul,
[dir="rtl"] .how-it-works-section ol {
  margin: 0 1.5rem 1rem 0;
  padding-left: 0;
  padding-right: 1.5rem;
}

.how-it-works-section ul li,
.how-it-works-section ol li {
  line-height: 1.7;
}

.how-it-works-section ul li strong,
.how-it-works-section ol li strong {
  color: var(--color-text-primary);
}

.how-it-works-section.highlight {
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 16px;
  padding: 1.5rem;
}

.how-it-works-section a {
  color: var(--bulma-primary);
  text-decoration: none;
}

.how-it-works-section a:hover {
  text-decoration: underline;
}

.how-it-works-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-base);
}

/* RTL adjustments for footer */
[dir="rtl"] .how-it-works-footer {
  direction: rtl;
}

.fade-in {
  animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .how-it-works-page {
    gap: 3rem;
  }

  .how-it-works-hero {
    padding: 4.5rem 1rem 3.5rem;
  }

  .how-it-works-surface {
    padding: 2.5rem 1.5rem;
  }

  .how-it-works-section h2 {
    font-size: 1.5rem;
  }

  .how-it-works-section h3 {
    font-size: 1.15rem;
  }
}
</style>


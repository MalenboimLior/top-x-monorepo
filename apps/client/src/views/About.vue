<template>
  <div class="about-page" :class="{ 'is-rtl': isRTL }">
    <!-- Background Effects -->
    <div class="bg-glow bg-glow--1" aria-hidden="true"></div>
    <div class="bg-glow bg-glow--2" aria-hidden="true"></div>
    <div class="grid-pattern" aria-hidden="true"></div>

    <div class="page-content layout-container">
      <!-- Hero Section -->
      <section class="about-hero">
        <div class="hero-badge fade-in-up" :style="{ animationDelay: '0.1s' }">
          <span class="badge-icon">🤖</span>
          <span class="badge-text">97% Grok Built</span>
        </div>

        <h1 class="hero-main-title fade-in-up" :style="{ animationDelay: '0.2s' }">
          <span class="brand-name">top-x</span>
          <span class="hero-subtitle">Play. Compete. Top Them All.</span>
        </h1>

        <div class="hero-tagline-container fade-in-up" :style="{ animationDelay: '0.3s' }">
          <p class="hero-tagline">{{ t('about.heroTagline') }}</p>
        </div>

        <div class="hero-visual fade-in-up" :style="{ animationDelay: '0.4s' }">
          <!-- Decorative Floating Elements -->
          <div class="floating-bubble bubble-1">🏆</div>
          <div class="floating-bubble bubble-2">🚀</div>
          <div class="floating-bubble bubble-3">🔥</div>
          <div class="floating-bubble bubble-4">✨</div>
          
          <div class="main-visual-card">
            <div class="card-glow"></div>
            <div class="card-content">
              <span class="card-emoji">🎮</span>
              <span class="card-label">The Ultimate Arena</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content Sections -->
      <div class="about-sections-grid">
        <!-- Who Are We -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.5s' }">
          <h2 class="section-heading">
            <span class="heading-icon">🤔</span>
            {{ t('about.who.title') }}
          </h2>
          <div class="info-body">
            <p>{{ t('about.who.p1') }}</p>
            <p>{{ t('about.who.p2') }}</p>
            <p>{{ t('about.who.p3') }}</p>
            <p class="highlight-p">{{ t('about.who.p4') }}</p>
          </div>
        </section>

        <!-- What Do We Do -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.6s' }">
          <h2 class="section-heading">
            <span class="heading-icon">🎯</span>
            {{ t('about.what.title') }}
          </h2>
          <div class="info-body">
            <p class="subtitle-p">{{ t('about.what.subtitle') }}</p>
            <ul class="feature-checklist">
              <li v-for="i in 7" :key="i">
                <span class="check-bullet">✔</span>
                {{ t(`about.what.list.${i}`) }}
              </li>
            </ul>
            <p class="footer-p">{{ t('about.what.footer') }}</p>
          </div>
        </section>
        
        <!-- TapToTransform Tool -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.65s' }">
          <h2 class="section-heading">
            <span class="heading-icon">🪄</span>
            {{ t('nav.tapToTransform') }}
          </h2>
          <div class="info-body">
            <p class="subtitle-p">{{ t('ttt.title') }}</p>
            <p>{{ t('ttt.explanation') }}</p>
            <div class="has-text-centered mt-4">
              <button class="cta-button mini" @click="$router.push('/tools/tap-to-transform')">
                <span class="cta-text">Try the Tool</span>
                <div class="cta-glow"></div>
              </button>
            </div>
          </div>
        </section>

        <!-- How To -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.7s' }">
          <h2 class="section-heading">
            <span class="heading-icon">⚙️</span>
            {{ t('about.how.title') }}
          </h2>
          <div class="info-body">
            <p>{{ t('about.how.p1') }}</p>
          </div>
        </section>

        <!-- Why Connect -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.8s' }">
          <h2 class="section-heading">
            <span class="heading-icon">🔌</span>
            {{ t('about.why.title') }}
          </h2>
          <div class="info-body">
            <p class="subtitle-p">{{ t('about.why.subtitle') }}</p>
            <div class="features-grid">
              <div v-for="i in 9" :key="i" class="grid-feature">
                <span class="star-bullet">⭐</span>
                {{ t(`about.why.list.${i}`) }}
              </div>
            </div>
            <p class="footer-p highlight-p">{{ t('about.why.footer') }}</p>
          </div>
        </section>

        <!-- FAQ -->
        <section class="faq-section fade-in-up" :style="{ animationDelay: '0.9s' }">
          <h2 class="section-heading centered">{{ t('about.faq.title') }}</h2>
          <div class="faq-grid">
            <div v-for="i in 4" :key="i" class="faq-item">
              <h3 class="faq-q">{{ t(`about.faq.q${i}`) }}</h3>
              <p class="faq-a" v-html="t(`about.faq.a${i}`)"></p>
            </div>
          </div>
        </section>

        <!-- Closing CTA -->
        <section class="closing-card fade-in-up" :style="{ animationDelay: '1s' }">
          <div class="closing-content">
            <div class="questions">
              <div class="q-group">
                <h4 class="q-title">{{ t('about.closing.title') }}</h4>
                <p class="a-text">{{ t('about.closing.titleAns') }}</p>
              </div>
              <div class="q-group">
                <h4 class="q-title">{{ t('about.closing.addictive') }}</h4>
                <p class="a-text">{{ t('about.closing.addictiveAns') }}</p>
              </div>
            </div>
            
            <p class="final-call">{{ t('about.closing.footer') }}</p>
            
            <button class="cta-button" @click="$router.push('/challenges')">
              <span class="cta-text">{{ t('about.closing.cta') }}</span>
              <div class="cta-glow"></div>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const route = useRoute();
const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');

const baseUrl = 'https://top-x.co';
const canonicalUrl = `${baseUrl}${route.path}`;

useHead(() => ({
  title: t('about.metaTitle'),
  meta: [
    { name: 'description', content: t('about.metaDescription') },
    { property: 'og:title', content: t('about.metaTitle') },
    { property: 'og:description', content: t('about.metaDescription') },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:site_name', content: 'TOP-X' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: canonicalUrl }],
}));

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
.about-page {
  position: relative;
  min-height: 100vh;
  background-color: #050505;
  color: #fff;
  padding-bottom: 6rem;
  overflow-x: hidden;
}

.page-content {
  position: relative;
  z-index: 10;
}

/* Background Effects */
.bg-glow {
  position: absolute;
  width: 60vw;
  height: 60vw;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}

.bg-glow--1 {
  top: -10%;
  left: -20%;
  background: radial-gradient(circle, #00e8e0 0%, transparent 70%);
}

.bg-glow--2 {
  bottom: -10%;
  right: -20%;
  background: radial-gradient(circle, #ff00ff 0%, transparent 70%);
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
  pointer-events: none;
}

/* Hero Section */
.about-hero {
  padding: 8rem 0 6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

.badge-icon { font-size: 1.2rem; }
.badge-text { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; }

.hero-main-title {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.brand-name {
  font-size: clamp(4rem, 10vw, 7rem);
  font-weight: 950;
  background: linear-gradient(135deg, #00e8e0 0%, #00b8b0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 0.9;
}

.hero-subtitle {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 800;
  color: #fff;
  opacity: 0.9;
}

.hero-tagline-container {
  margin-bottom: 4rem;
}

.hero-tagline {
  font-size: 1.4rem;
  font-weight: 600;
  color: #00e8e0;
  letter-spacing: 0.05em;
}

.hero-visual {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.main-visual-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem 4rem;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  z-index: 2;
  transform: translateY(0);
  animation: float-main 6s ease-in-out infinite;
}

.card-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, #00e8e0, transparent, #ff00ff, transparent);
  border-radius: 26px;
  z-index: -1;
  opacity: 0.3;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.card-emoji { font-size: 3rem; }
.card-label { font-size: 1.5rem; font-weight: 800; }

.floating-bubble {
  position: absolute;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  backdrop-filter: blur(10px);
  z-index: 1;
}

.bubble-1 { top: -20%; left: 0; animation: float 5s ease-in-out infinite; }
.bubble-2 { top: 40%; right: -10%; animation: float 7s ease-in-out infinite 1s; }
.bubble-3 { bottom: -20%; left: 15%; animation: float 6s ease-in-out infinite 0.5s; }
.bubble-4 { top: 10%; right: 10%; animation: float 8s ease-in-out infinite 1.5s; }

/* Content Sections */
.about-sections-grid {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.info-card {
  background: rgba(25, 25, 25, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 32px;
  padding: 4rem;
  transition: all 0.4s ease;
}

.info-card:hover {
  border-color: rgba(0, 232, 224, 0.3);
  background: rgba(30, 30, 30, 0.6);
}

.section-heading {
  font-size: 2.5rem;
  font-weight: 900;
  margin-bottom: 2.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.is-rtl .section-heading {
  flex-direction: row-reverse;
}

.section-heading.centered {
  justify-content: center;
  text-align: center;
}

.heading-icon { font-size: 3rem; }

.info-body {
  font-size: 1.2rem;
  line-height: 1.8;
  color: #ccc;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.is-rtl .info-body {
  text-align: right;
}

.highlight-p {
  color: #00e8e0;
  font-weight: 700;
  font-size: 1.4rem;
}

.subtitle-p {
  font-weight: 700;
  color: #fff;
  font-size: 1.4rem;
}

.feature-checklist {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.feature-checklist li {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
}

.is-rtl .feature-checklist li {
  flex-direction: row-reverse;
}

.check-bullet {
  color: #00e8e0;
  font-weight: 900;
  font-size: 1.2rem;
}

.footer-p {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-inline-start: 4px solid #00e8e0;
  border-radius: 8px;
  font-style: italic;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin: 1rem 0;
}

.grid-feature {
  background: rgba(255, 255, 255, 0.03);
  padding: 1.5rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.is-rtl .grid-feature {
  flex-direction: row-reverse;
}

.star-bullet { color: #facc15; }

/* FAQ Styling */
.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.faq-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 2.5rem;
  transition: all 0.3s ease;
}

.faq-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #00e8e0;
}

.faq-q { font-size: 1.4rem; font-weight: 800; margin-bottom: 1rem; color: #fff; }
.faq-a { color: #aaa; line-height: 1.6; font-size: 1.1rem; }

.is-rtl .faq-item { text-align: right; }

/* Closing Card */
.closing-card {
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%);
  border-radius: 40px;
  padding: 5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.closing-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.q-title { font-size: 1.8rem; font-weight: 900; margin-bottom: 0.5rem; }
.a-text { font-size: 1.5rem; font-weight: 700; color: #00e8e0; }

.final-call { font-size: 1.5rem; font-weight: 600; color: #fff; }

.cta-button {
  position: relative;
  align-self: center;
  padding: 1.5rem 4rem;
  background: #00e8e0;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.cta-button:hover { transform: scale(1.05); }
.cta-button.mini { padding: 1rem 2.5rem; }
.cta-button.mini .cta-text { font-size: 1.1rem; }

.cta-text {
  position: relative;
  z-index: 2;
  font-size: 1.4rem;
  font-weight: 900;
  color: #000;
}

.cta-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
  animation: rotate-glow 5s linear infinite;
  z-index: 1;
}

/* Animations */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-15px) rotate(5deg); }
}

@keyframes float-main {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes rotate-glow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in-up {
  opacity: 0;
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Responsive */
@media (max-width: 768px) {
  .about-hero { padding: 6rem 0 4rem; }
  .brand-name { font-size: 4rem; }
  .info-card { padding: 2.5rem; }
  .section-heading { font-size: 1.8rem; flex-direction: column; text-align: center; }
  .heading-icon { font-size: 2.5rem; }
  .faq-grid { grid-template-columns: 1fr; }
  .closing-card { padding: 3rem 1.5rem; }
  .main-visual-card { padding: 1.5rem 2rem; }
}
</style>

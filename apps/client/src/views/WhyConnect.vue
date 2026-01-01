<template>
  <div class="why-connect-page" :class="{ 'is-rtl': isRTL }">
    <!-- Background Effects -->
    <div class="bg-glow bg-glow--1" aria-hidden="true"></div>
    <div class="bg-glow bg-glow--2" aria-hidden="true"></div>
    <div class="grid-pattern" aria-hidden="true"></div>

    <div class="page-content layout-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-badge fade-in-up" :style="{ animationDelay: '0.1s' }">
          <span class="badge-icon">🔌</span>
          <span class="badge-text">Connection Benefits</span>
        </div>

        <h1 class="hero-main-title fade-in-up" :style="{ animationDelay: '0.2s' }">
          <span class="brand-name">{{ t('why-connect.hero.title') }}</span>
        </h1>

        <div class="hero-tagline-container fade-in-up" :style="{ animationDelay: '0.3s' }">
          <p class="hero-tagline">{{ t('why-connect.hero.subtitle') }}</p>
        </div>

        <div class="hero-visual fade-in-up" :style="{ animationDelay: '0.4s' }">
          <div class="main-visual-card">
            <div class="card-glow"></div>
            <div class="card-content">
              <span class="card-emoji">🤝</span>
              <span class="card-label">Fair Play Connection</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content Sections -->
      <div class="content-sections-grid">
        <!-- Main Reason -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.5s' }">
          <div class="info-body">
            <p>{{ t('why-connect.main.p1') }}</p>
            <p>{{ t('why-connect.main.p2') }}</p>
          </div>
        </section>

        <!-- Skeptics Section -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.6s' }">
          <h2 class="section-heading">
            <span class="heading-icon">🕵️‍♂️</span>
            {{ t('why-connect.skeptics.title') }}
          </h2>
          <div class="info-body">
            <p class="subtitle-p">{{ t('why-connect.skeptics.subtitle') }}</p>
            <p>{{ t('why-connect.skeptics.body') }}</p>
          </div>
        </section>

        <!-- Truth Section -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.7s' }">
          <h2 class="section-heading">
            <span class="heading-icon">📜</span>
            {{ t('why-connect.truth.title') }}
          </h2>
          <div class="info-body">
            <div class="truth-bullets">
              <p v-for="i in 4" :key="i" class="truth-bullet">
                {{ t(`why-connect.truth.bullet${i}`) }}
              </p>
            </div>
          </div>
        </section>

        <!-- Purpose Section -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.8s' }">
          <h2 class="section-heading">
            <span class="heading-icon">🎯</span>
            {{ t('why-connect.purpose.title') }}
          </h2>
          <div class="info-body">
            <p class="highlight-p">{{ t('why-connect.purpose.body') }}</p>
          </div>
        </section>

        <!-- Benefits Section -->
        <section class="info-card fade-in-up" :style="{ animationDelay: '0.9s' }">
          <h2 class="section-heading">
            <span class="heading-icon">✨</span>
            {{ t('why-connect.benefits.title') }}
          </h2>
          <div class="info-body">
            <p class="subtitle-p">{{ t('why-connect.benefits.subtitle') }}</p>
            <div class="benefits-grid">
              <div v-for="i in 9" :key="i" class="benefit-item">
                <span class="benefit-text">{{ t(`why-connect.benefits.list.${i}`) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Summary Section -->
        <section class="info-card summary-card fade-in-up" :style="{ animationDelay: '1s' }">
          <h2 class="section-heading centered">
            <span class="heading-icon">💡</span>
            {{ t('why-connect.summary.title') }}
          </h2>
          <div class="info-body">
            <p class="summary-text">{{ t('why-connect.summary.body') }}</p>
            <p class="summary-text highlight-p">{{ t('why-connect.summary.body2') }}</p>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section fade-in-up" :style="{ animationDelay: '1.1s' }">
          <button class="cta-button" @click="handleConnect">
            <span class="cta-text">{{ t('why-connect.hero.cta') }}</span>
            <div class="cta-glow"></div>
          </button>
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
import { useUserStore } from '@/stores/user';

const localeStore = useLocaleStore();
const userStore = useUserStore();
const route = useRoute();
const t = (key: string) => localeStore.translate(key);
const isRTL = computed(() => localeStore.direction === 'rtl');

const baseUrl = 'https://top-x.co';
const canonicalUrl = `${baseUrl}${route.path}`;

const handleConnect = () => {
  // Handle X login
  userStore.login();
};

useHead(() => ({
  title: t('why-connect.metaTitle'),
  meta: [
    { name: 'description', content: t('why-connect.metaDescription') },
    { property: 'og:title', content: t('why-connect.metaTitle') },
    { property: 'og:description', content: t('why-connect.metaDescription') },
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
.why-connect-page {
  position: relative;
  min-height: 100vh;
  background-color: #050505;
  color: #fff;
  padding-bottom: 2rem;
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
.hero-section {
  padding: 4rem 0 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.is-rtl .hero-section {
  text-align: right;
}

.hero-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  margin-bottom: 1rem;
  backdrop-filter: blur(10px);
}

.badge-icon { font-size: 1.2rem; }
.badge-text { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; }

.hero-main-title {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
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

.hero-tagline-container {
  margin-bottom: 2rem;
}

.hero-tagline {
  font-size: 1.4rem;
  font-weight: 600;
  color: #00e8e0;
  letter-spacing: 0.05em;
}

.is-rtl .hero-tagline {
  text-align: right;
}

.hero-visual {
  position: relative;
  width: 100%;
  max-width: 500px;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.main-visual-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem 2rem;
  border-radius: 20px;
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

/* Content Sections */
.content-sections-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-card {
  background: rgba(25, 25, 25, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 32px;
  padding: 2rem;
  transition: all 0.4s ease;
}

.info-card:hover {
  border-color: rgba(0, 232, 224, 0.3);
  background: rgba(30, 30, 30, 0.6);
}

.summary-card {
  background: linear-gradient(135deg, rgba(0, 232, 224, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-heading {
  font-size: 2rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-heading.centered {
  justify-content: center;
  text-align: center;
}

.heading-icon { font-size: 3rem; }

.info-body {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #ccc;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.is-rtl .subtitle-p {
  text-align: right;
}

.truth-bullets {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.truth-bullet {
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 1rem;
  line-height: 1.5;
}

.is-rtl .truth-bullet {
  text-align: right;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin: 0.5rem 0;
}

.is-rtl .benefits-grid {
  direction: rtl;
}

.benefit-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.is-rtl .benefit-item {
  text-align: right;
}

.benefit-text {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

.summary-text {
  font-size: 1.3rem;
  font-weight: 700;
  text-align: center;
  color: #fff;
}

.summary-text.highlight-p {
  color: #00e8e0;
  font-size: 1.5rem;
  margin-top: 1rem;
}

/* CTA Section */
.cta-section {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.cta-button {
  position: relative;
  padding: 1.5rem 4rem;
  background: #00e8e0;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.cta-button:hover { transform: scale(1.05); }

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
  .hero-section { padding: 3rem 0 2rem; }
  .brand-name { font-size: 3rem; }
  .info-card { padding: 1.5rem; }
  .section-heading { font-size: 1.5rem; flex-direction: column; text-align: center; }
  .heading-icon { font-size: 2rem; }
  .benefits-grid { grid-template-columns: 1fr; }
  .truth-bullets { gap: 0.6rem; }
  .truth-bullet { padding: 0.8rem; font-size: 0.9rem; }
  .summary-text { font-size: 1.1rem; }
  .summary-text.highlight-p { font-size: 1.3rem; }
}
</style>

<template>
  <section class="how-it-works layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="section-header fade-in-up">
      <div class="section-header__content">
        <h2 class="section-title">{{ t('home.howItWorksTitle') }}</h2>
      </div>
    </header>

    <div class="how-it-works__grid">
      <RouterLink
        v-for="(block, index) in blocks"
        :key="block.id"
        class="how-it-works__card fade-in-up"
        :style="{ animationDelay: `${index * 0.15}s` }"
        :to="block.to"
        :aria-label="block.ariaLabel"
      >
        <div class="how-it-works__visual">
          <div :class="['visual-container', block.visualClass]" :style="{ animationDelay: `${index * 0.5}s` }">
            <span class="icon-visual">{{ block.icon }}</span>
          </div>
        </div>
        <div class="how-it-works__content">
          <h3 class="how-it-works__card-title">{{ block.title }}</h3>
          <p v-if="block.subtitle" class="how-it-works__card-text">{{ block.subtitle }}</p>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const isRTL = computed(() => localeStore.direction === 'rtl');

const blocks = computed(() => {
  const direction = localeStore.direction;
  const order = direction === 'rtl'
    ? ['play', 'compete', 'create'] as const
    : ['create', 'compete', 'play'] as const;

  const lookup = {
    create: {
      id: 'create',
      title: t('home.howItWorks.createTitle'),
      subtitle: t('home.howItWorks.createText'),
      icon: '🧱',
      visualClass: 'visual-create',
      to: '/build',
    },
    compete: {
      id: 'compete',
      title: t('home.howItWorks.competeTitle'),
      subtitle: t('home.howItWorks.competeText'),
      icon: '🏆',
      visualClass: 'visual-compete',
      to: '/users',
    },
    play: {
      id: 'play',
      title: t('home.howItWorks.playTitle'),
      subtitle: t('home.howItWorks.playText') || t('home.playNow'),
      icon: '🎮',
      visualClass: 'visual-play',
      to: { hash: '#featuredGames' },
    },
  };

  return order.map((key) => ({
    ...lookup[key],
    ariaLabel: lookup[key].subtitle
      ? `${lookup[key].title} — ${lookup[key].subtitle}`
      : lookup[key].title,
  }));
});
</script>

<style scoped>
.how-it-works {
  position: relative;
  width: 100%;
  margin-top: var(--space-8);
}

.how-it-works.is-rtl {
  direction: rtl;
}

.section-header {
  margin-bottom: var(--space-6);
  text-align: start;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.how-it-works__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  width: 100%;
}

.how-it-works__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.5rem 2rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-decoration: none;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  backdrop-filter: blur(12px);
}

.how-it-works__card:hover {
  transform: translateY(-10px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* Card-specific hover glows */
.how-it-works__card:nth-child(1):hover { box-shadow: 0 20px 50px rgba(255, 107, 107, 0.15); border-color: rgba(255, 107, 107, 0.4); }
.how-it-works__card:nth-child(2):hover { box-shadow: 0 20px 50px rgba(79, 172, 254, 0.15); border-color: rgba(79, 172, 254, 0.4); }
.how-it-works__card:nth-child(3):hover { box-shadow: 0 20px 50px rgba(67, 233, 123, 0.15); border-color: rgba(67, 233, 123, 0.4); }

.how-it-works__visual {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.visual-container {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: var(--color-bg-secondary);
  animation: float-icon 6s ease-in-out infinite;
}

/* Specific glows for visual containers */
.visual-create { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3); }
.visual-compete { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); box-shadow: 0 10px 30px rgba(79, 172, 254, 0.3); }
.visual-play { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); box-shadow: 0 10px 30px rgba(67, 233, 123, 0.3); }

.how-it-works__card:hover .visual-container {
  transform: scale(1.15) rotate(5deg);
}

.how-it-works__card:hover .visual-create { box-shadow: 0 0 50px rgba(255, 107, 107, 0.6); }
.how-it-works__card:hover .visual-compete { box-shadow: 0 0 50px rgba(79, 172, 254, 0.6); }
.how-it-works__card:hover .visual-play { box-shadow: 0 0 50px rgba(67, 233, 123, 0.6); }


.icon-visual {
  font-size: 3.5rem;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.25));
  transition: transform 0.4s ease;
  display: block;
}

.how-it-works__card:hover .icon-visual {
  transform: scale(1.1) rotate(-5deg);
}

.how-it-works__content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  z-index: 2;
}

.how-it-works__card-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.how-it-works__card:hover .how-it-works__card-title {
  color: #fff;
  text-shadow: 0 0 20px rgba(255,255,255,0.3);
}

.how-it-works__card-text {
  font-size: 1.05rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  opacity: 0.9;
}

/* Animations */
@keyframes float-icon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

/* Reusing fade-in-up from global or defining if missing locally, assuming Home.css has it.
   Defining simple version here just in case to ensure "live" feel immediately. */
.fade-in-up {
  opacity: 0;
  animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* RTL Support */
.how-it-works.is-rtl .section-header {
  text-align: right;
}

@media (max-width: 960px) {
  .how-it-works__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .how-it-works__grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .how-it-works__card {
    padding: 2rem 1.5rem;
  }
}
</style>




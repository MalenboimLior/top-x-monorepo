<template>
  <section class="how-it-works layout-container section-stack" :class="{ 'is-rtl': isRTL }">
    <header class="how-it-works__header">
      <h2 class="how-it-works__title">{{ t('home.howItWorksTitle') }}</h2>
    </header>

    <div class="how-it-works__grid">
      <RouterLink
        v-for="block in blocks"
        :key="block.id"
        class="how-it-works__card"
        :to="block.to"
        :aria-label="block.ariaLabel"
      >
        <div class="card-visual">
          <img class="card-gif" :src="block.image" :alt="block.imageAlt" />
        </div>
        <div class="card-content">
          <h3 class="card-title">{{ block.title }}</h3>
          <p v-if="block.subtitle" class="card-subtitle">{{ block.subtitle }}</p>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import fallbackGif from '@/assets/images/fallback.png';

const props = withDefaults(
  defineProps<{
    createImage?: string;
    competeImage?: string;
    playImage?: string;
  }>(),
  {
    createImage: fallbackGif,
    competeImage: fallbackGif,
    playImage: fallbackGif,
  },
);

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
      image: props.createImage,
      imageAlt: t('home.howItWorks.createTitle'),
      to: '/build',
    },
    compete: {
      id: 'compete',
      title: t('home.howItWorks.competeTitle'),
      subtitle: t('home.howItWorks.competeText'),
      image: props.competeImage,
      imageAlt: t('home.howItWorks.competeTitle'),
      to: '/users',
    },
    play: {
      id: 'play',
      title: t('home.howItWorks.playTitle'),
      subtitle: null,
      image: props.playImage,
      imageAlt: t('home.howItWorks.playTitle'),
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
  padding-block: clamp(var(--space-9), 12vh, var(--space-11));
  color: #ffffff;
  --section-stack-gap: clamp(var(--space-4), 4vh, var(--space-5));
}

.how-it-works.is-rtl {
  direction: rtl;
}

.how-it-works__header {
  text-align: center;
}

.how-it-works__title {
  font-size: clamp(2rem, 4vw, 2.6rem);
  font-weight: 800;
  margin: 0;
  color: #ffffff;
  text-shadow: 0 28px 55px rgba(0, 232, 224, 0.35);
}

.how-it-works.is-rtl .how-it-works__title {
  letter-spacing: 0.02em;
}

.how-it-works__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1.5rem, 3vw, 2.25rem);
}

.how-it-works__card {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: clamp(1.8rem, 2.5vw, 2.3rem);
  border-radius: 28px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(0, 232, 224, 0.16);
  box-shadow: 0 32px 55px rgba(0, 0, 0, 0.45);
  text-decoration: none;
  color: inherit;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(14px);
}

.how-it-works__card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(0, 232, 224, 0.25);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.how-it-works__card:focus-visible {
  outline: 3px solid rgba(0, 232, 224, 0.7);
  outline-offset: 4px;
}

.how-it-works__card:hover,
.how-it-works__card:focus-visible {
  transform: translateY(-8px);
  box-shadow: 0 42px 68px rgba(0, 0, 0, 0.55);
  border-color: rgba(0, 232, 224, 0.45);
}

.how-it-works__card:hover::after,
.how-it-works__card:focus-visible::after {
  opacity: 1;
}

.card-visual {
  position: relative;
  display: flex;
  justify-content: center;
}

.card-gif {
  width: min(190px, 48vw);
  height: auto;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.how-it-works__card:hover .card-gif,
.how-it-works__card:focus-visible .card-gif {
  transform: scale(1.05);
  box-shadow: 0 28px 55px rgba(0, 0, 0, 0.55);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: center;
}

.card-title {
  font-size: clamp(1.4rem, 2.5vw, 1.8rem);
  font-weight: 700;
  margin: 0;
  color: #ffffff;
}

.card-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: clamp(1rem, 2vw, 1.1rem);
  font-weight: 500;
}

.how-it-works.is-rtl .card-subtitle {
  font-size: clamp(1rem, 2.2vw, 1.15rem);
}

@media (max-width: 960px) {
  .how-it-works__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .how-it-works {
    padding-block: clamp(var(--space-9), 12vh, var(--space-11));
  }

  .how-it-works__grid {
    grid-template-columns: 1fr;
  }

  .how-it-works__card {
    padding: clamp(1.6rem, 5vw, 1.9rem);
  }

  .card-gif {
    width: min(220px, 70vw);
  }
}
</style>


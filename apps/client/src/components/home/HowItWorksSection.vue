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
  /*padding-block: clamp(var(--space-9), 12vh, var(--space-11));*/
  color: var(--color-text-primary);
  --section-stack-gap: clamp(var(--space-2), 2vh, var(--space-3));
}

.how-it-works.is-rtl {
  direction: rtl;
}

.how-it-works__header {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.3rem, 0.8vw, 0.45rem);
  padding-block: clamp(0.8rem, 2vw, 1.2rem);
  padding-inline: 0;
  width: 100%;
  background: transparent;
  text-align: start;
}

.how-it-works__header::before,
.how-it-works__header::after {
  display: none; /* Removed for flat design */
}

.how-it-works__title {
  font-size: clamp(1.5rem, 1.2vw + 1.5rem, 3rem);
  font-weight: 800;
  margin: 0;
  color: var(--color-text-primary);
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
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border-base);
  text-decoration: none;
  color: inherit;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.how-it-works__card::after {
  display: none; /* Removed for flat design */
}

.how-it-works__card:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.how-it-works__card:hover,
.how-it-works__card:focus-visible {
  background-color: var(--color-bg-card-hover);
  border-color: var(--color-border-primary);
}

.card-visual {
  position: relative;
  display: flex;
  justify-content: center;
}

.card-gif {
  width: min(190px, 48vw);
  height: auto;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-base);
  transition: border-color var(--transition-fast);
}

.how-it-works__card:hover .card-gif,
.how-it-works__card:focus-visible .card-gif {
  border-color: var(--color-border-primary);
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
  color: var(--color-text-primary);
}

.card-subtitle {
  margin: 0;
  color: var(--color-text-secondary);
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

  .how-it-works__header {
    padding-inline: clamp(1rem, 3.4vw, 1.4rem);
    padding-inline-start: clamp(1.6rem, 5vw, 2.1rem);
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


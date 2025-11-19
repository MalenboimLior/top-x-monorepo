<template>
  <div class="page-container not-found-page">
    <section class="not-found-hero">
      <div class="not-found-hero__glow"></div>
      <div class="not-found-hero__content">
        <p class="not-found-hero__pill">404</p>
        <h1 class="not-found-hero__title">Page Not Found</h1>
        <p class="not-found-hero__subtitle">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
    </section>

    <section class="not-found-body">
      <div class="not-found-surface">
        <div class="not-found-copy">
          <p>Don't worry, you can still explore TOP-X and discover amazing games!</p>
        </div>
        <div class="not-found-actions">
          <CustomButton
            type="is-primary is-large"
            label="Go to Home"
            @click="$router.push('/')"
          />
          <CustomButton
            type="is-info is-large"
            label="Browse Games"
            @click="$router.push('/')"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

useHead({
  title: '404 - Page Not Found | TOP-X',
  meta: [
    {
      name: 'description',
      content: 'The page you are looking for could not be found. Return to TOP-X to discover games, challenges, and competitions.',
    },
    {
      name: 'robots',
      content: 'noindex, follow',
    },
  ],
});
</script>

<style scoped>
.not-found-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.not-found-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.not-found-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(0, 232, 224, 0.25), transparent 60%),
    radial-gradient(circle at 70% 30%, rgba(196, 255, 0, 0.18), transparent 60%);
  pointer-events: none;
  opacity: 0.8;
}

.not-found-hero__content {
  position: relative;
  width: min(760px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.not-found-hero__pill {
  display: inline-flex;
  padding: 0.4rem 1.3rem;
  border-radius: 999px;
  background: rgba(0, 232, 224, 0.15);
  color: var(--bulma-primary);
  letter-spacing: 0.12em;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.not-found-hero__title {
  font-size: clamp(2.5rem, 2vw + 2rem, 3.8rem);
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.not-found-hero__subtitle {
  margin: 0;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.72);
  max-width: 48ch;
}

.not-found-body {
  padding: 0 1.5rem 4rem;
  display: flex;
  justify-content: center;
}

.not-found-surface {
  width: min(760px, 100%);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
}

.not-found-copy {
  text-align: center;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
}

.not-found-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

@media (max-width: 768px) {
  .not-found-actions {
    flex-direction: column;
    width: 100%;
  }

  .not-found-actions :deep(.button) {
    width: 100%;
  }
}
</style>


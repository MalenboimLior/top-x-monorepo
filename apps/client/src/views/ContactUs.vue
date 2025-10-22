<template>
  <div class="contact-page">
    <section class="contact-hero">
      <div class="contact-hero__glow"></div>
      <div class="contact-hero__content">
        <span class="contact-hero__pill">Need a hand?</span>
        <h1 class="contact-hero__title">Contact the TOP-X team</h1>
        <p class="contact-hero__subtitle">
          We’re here to help with partnerships, community questions, and support for your games.
        </p>
      </div>
    </section>

    <section class="contact-body">
      <div class="contact-card">
        <div class="contact-card__section">
          <h2>Talk to us</h2>
          <p>For support, questions, or feedback, email the crew. We reply within two business days.</p>
          <a href="mailto:support@top-x.co" class="contact-link">support@top-x.co</a>
        </div>
        <div class="contact-card__divider"></div>
        <div class="contact-card__section">
          <h2>Follow the updates</h2>
          <p>Join the conversation on X to hear about new games, creator spotlights, and live drops.</p>
          <a href="https://x.com/Topxapp" target="_blank" rel="noopener" class="contact-link">
            <font-awesome-icon :icon="['fab', 'x-twitter']" class="contact-link__icon" /> @Topxapp
          </a>
        </div>
        <div class="contact-card__cta">
          <CustomButton label="Back to home" type="is-primary" @click="$router.push('/')" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

useHead({
  title: 'Contact TOP-X',
  meta: [
    {
      name: 'description',
      content: 'Get in touch with the TOP-X team for support, partnerships, and community updates.',
    },
  ],
});
</script>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: radial-gradient(circle at top left, rgba(0, 232, 224, 0.15), transparent 55%),
    radial-gradient(circle at top right, rgba(196, 255, 0, 0.12), transparent 45%),
    #060606;
  color: #f8f8fc;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.contact-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.contact-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 30%, rgba(0, 232, 224, 0.25), transparent 60%);
  pointer-events: none;
  opacity: 0.9;
}

.contact-hero__content {
  position: relative;
  width: min(720px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.contact-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.contact-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.contact-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.1rem;
  line-height: 1.7;
}

.contact-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.contact-card {
  width: min(800px, 100%);
  background: rgba(10, 10, 10, 0.75);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: clamp(2rem, 4vw, 3rem);
  display: grid;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  position: relative;
}

.contact-card__section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: center;
}

.contact-card__section h2 {
  margin: 0;
  font-size: 1.6rem;
}

.contact-card__section p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.6;
}

.contact-card__divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 232, 224, 0.35), transparent);
}

.contact-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--bulma-primary);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.contact-link:hover,
.contact-link:focus {
  color: rgba(196, 255, 0, 0.85);
}

.contact-link__icon {
  font-size: 1.2rem;
}

.contact-card__cta {
  display: flex;
  justify-content: center;
}

@media (max-width: 640px) {
  .contact-card {
    padding: 1.75rem;
  }

  .contact-card__divider {
    margin: 0 auto;
    width: 80%;
  }
}
</style>

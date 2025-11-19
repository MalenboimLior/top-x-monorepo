<template>
  <div class="page-container policy-page">
    <section class="policy-hero">
      <div class="policy-hero__glow"></div>
      <div class="policy-hero__content">
        <span class="policy-hero__pill">Legal</span>
        <h1 class="policy-hero__title">Privacy Policy</h1>
        <p class="policy-hero__subtitle">Effective Date: July 17, 2025</p>
      </div>
    </section>

    <section class="policy-body">
      <div class="policy-surface">
        <article class="policy-section">
          <h2>How we protect your data</h2>
          <p>
            At TOP-X, we value your privacy. We collect the minimum data needed to deliver gameplay, such as your X login
            details and the games you interact with. This data is stored securely, encrypted in transit and at rest, and never
            sold to third parties.
          </p>
          <p>
            You may request data deletion or export at any time by contacting our team. We’ll respond within 30 days and keep
            you updated through the process.
          </p>
        </article>

        <article class="policy-section">
          <h2>Cookies & analytics</h2>
          <p>
            We use essential cookies to keep you signed in and maintain session stability. With consent, we may enable
            analytics cookies (e.g., Firebase Analytics) to understand how challenges perform and improve the platform.
          </p>
          <p>
            You can update cookie preferences via the in-app settings at any time. We do not share cookies with external
            advertisers or brokers.
          </p>
        </article>

        <div class="policy-cta">
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
  title: 'TOP-X Privacy Policy',
  meta: [
    {
      name: 'description',
      content: 'Learn how TOP-X protects your data, handles cookies, and keeps your account secure.',
    },
  ],
});
</script>

<style scoped>
.policy-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.policy-hero {
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem 2.5rem;
  display: flex;
  justify-content: center;
}

.policy-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 30%, rgba(0, 232, 224, 0.22), transparent 60%),
    radial-gradient(circle at 70% 20%, rgba(196, 255, 0, 0.15), transparent 60%);
  pointer-events: none;
}

.policy-hero__content {
  position: relative;
  width: min(760px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.policy-hero__pill {
  display: inline-flex;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(0, 232, 224, 0.18);
  color: var(--bulma-primary);
  font-weight: 600;
}

.policy-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 2vw + 2rem, 3.5rem);
}

.policy-hero__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.1rem;
}

.policy-body {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem 4rem;
}

.policy-surface {
  width: min(960px, 100%);
  background: rgba(12, 12, 12, 0.82);
  border-radius: 32px;
  border: 1px solid rgba(0, 232, 224, 0.14);
  padding: clamp(2rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.policy-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.policy-section h2 {
  margin: 0;
  font-size: 1.75rem;
}

.policy-section p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
}

.policy-cta {
  display: flex;
  justify-content: center;
}

@media (max-width: 640px) {
  .policy-section h2 {
    font-size: 1.4rem;
  }
}
</style>

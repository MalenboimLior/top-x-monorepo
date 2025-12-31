<template>
  <div class="page-container privacy-page" dir="ltr">
    <section class="privacy-hero">
      <div class="privacy-hero__glow"></div>
      <div class="privacy-hero__content">
        <p class="privacy-hero__pill">Privacy</p>
        <h1 class="privacy-hero__title">Manage Privacy Settings</h1>
        <p class="privacy-hero__subtitle">
          Privacy rights and information management
        </p>
        <p class="privacy-hero__date">Last Updated: November 17, 2025</p>
      </div>
    </section>

    <section class="privacy-body fade-in">
      <div class="privacy-surface">
        <div class="privacy-content">
          <p class="privacy-intro">
            Top-X allows users covered by the California Consumer Privacy Act (CCPA) to submit requests regarding their personal information.
          </p>

          <div class="privacy-main">
            <p>
              If you wish to submit a "Do Not Sell or Share My Personal Information" request, or any other privacy-related request under applicable law, please contact:
            </p>

            <div class="contact-info">
              <p>📧 <a href="mailto:Requests@Top-X.co">Requests@Top-X.co</a></p>
            </div>

            <p>
              Top-X will review and process your request in accordance with applicable law and its technical capabilities.
            </p>

            <div class="cookie-notice">
              <p>
                <strong>Important:</strong> Top-X does not provide a cookie consent tool and does not support granular cookie preference management. Use your browser settings to block or delete cookies.
              </p>
            </div>
          </div>
        </div>

        <div class="privacy-footer">
          <CustomButton
            type="is-primary is-large"
            :label="t('games.backToHome')"
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
  title: 'Manage Privacy Settings - TOP-X',
  meta: [
    {
      name: 'description',
      content: 'Manage your privacy settings and submit CCPA requests for the TOP-X gaming platform.',
    },
    {
      name: 'keywords',
      content: 'TOP-X privacy, CCPA, privacy settings, data requests',
    },
    // Open Graph tags
    {
      property: 'og:title',
      content: 'Manage Privacy Settings - TOP-X',
    },
    {
      property: 'og:description',
      content: 'Manage your privacy settings and submit CCPA requests for the TOP-X gaming platform.',
    },
    {
      property: 'og:type',
      content: 'article',
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
      content: 'Manage Privacy Settings - TOP-X',
    },
    {
      name: 'twitter:description',
      content: 'Manage your privacy settings and submit CCPA requests for the TOP-X gaming platform.',
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
.privacy-page {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  direction: ltr;
  text-align: left;
}

.privacy-hero {
  position: relative;
  overflow: hidden;
  padding: 6rem 1.5rem 5rem;
  display: flex;
  justify-content: center;
}

.privacy-hero__glow {
  display: none;
}

.privacy-hero__content {
  position: relative;
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  align-items: center;
}

.privacy-hero__pill {
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

.privacy-hero__title {
  font-size: clamp(2.5rem, 2vw + 2rem, 3.8rem);
  font-weight: 700;
  margin: 0;
}

.privacy-hero__subtitle {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  max-width: 48ch;
}

.privacy-hero__date {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.privacy-body {
  padding: 0 1.5rem 4rem;
  display: flex;
  justify-content: center;
}

.privacy-surface {
  width: min(960px, 100%);
  background-color: var(--color-bg-card);
  border-radius: 32px;
  border: 1px solid var(--color-border-base);
  padding: 3rem clamp(1.75rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.privacy-content {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  line-height: 1.7;
}

.privacy-intro {
  font-size: 1.05rem;
  color: var(--color-text-secondary);
  padding: 1.5rem;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 16px;
  margin: 0;
}

.privacy-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.privacy-main p {
  margin: 0;
}

.contact-info {
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
}

.contact-info p {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.contact-info a {
  color: var(--bulma-primary);
  text-decoration: underline;
}

.cookie-notice {
  background-color: rgba(255, 193, 7, 0.1);
  border: 2px solid rgba(255, 193, 7, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
}

.cookie-notice p {
  margin: 0;
  color: var(--color-text-primary);
}

.privacy-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-base);
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
  .privacy-page {
    gap: 3rem;
  }

  .privacy-hero {
    padding: 4.5rem 1rem 3.5rem;
  }

  .privacy-surface {
    padding: 2.5rem 1.5rem;
  }
}
</style>

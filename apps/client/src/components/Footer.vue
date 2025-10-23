<template>
  <footer class="footer has-background-dark has-text-white">
    <div class="footer-glow"></div>
    <div class="footer-content layout-container section-stack">
      <div class="footer-branding">
        <router-link to="/about" class="grok-badge">{{ t('footer.powered') }}</router-link>
        <p class="footer-tagline">Play together. Compete everywhere.</p>
      </div>
      <div class="footer-links">
        <router-link to="/contact" class="footer-link">{{ t('footer.terms') }}</router-link>
        <router-link to="/contact" class="footer-link">{{ t('footer.privacy') }}</router-link>
        <router-link to="/contact" class="footer-link">{{ t('footer.contact') }}</router-link>
        <a href="https://x.com/Topxapp" target="_blank" rel="noopener" class="footer-link">
          <font-awesome-icon :icon="['fab', 'x-twitter']"  /> {{ t('footer.follow') }}
        </a>
      </div>
      <p class="footer-copy">
        {{ t('footer.copyright') }}
      </p>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useLocaleStore } from '@/stores/locale';

export default defineComponent({
  name: 'Footer',
  setup() {
    const localeStore = useLocaleStore();
    const t = (key: string) => localeStore.translate(key);

    return { t };
  },
  methods: {
    manageCookies() {
      localStorage.removeItem('cookieConsent'); // Reset to show banner again
      // Optionally, emit event or use store to trigger banner visibility
      window.location.reload(); // Simple way to re-show banner
    },
  },
});
</script>

<style scoped>
.footer {
  position: relative;
  background: #000;
  padding: var(--space-10) var(--space-6) var(--space-9);
  overflow: hidden;
  border-top: 1px solid rgba(0, 232, 224, 0.12);
}

.footer-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(0, 232, 224, 0.22), transparent 55%);
  opacity: 0.7;
  pointer-events: none;
}

.footer-content {
  position: relative;
  width: 100%;
  --section-stack-gap: var(--space-7);
  align-items: center;
  text-align: center;
}

.footer-branding {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.grok-badge {
  color: var(--bulma-primary); /* #1da1f2 X.com blue */
  font-weight: 600;
  font-size: 1.1rem;
  transition: color 0.3s ease;
}

.footer-tagline {
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--font-size-400);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.grok-badge:hover {
  color: #66fff6;
  text-decoration: none;
}

.footer-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.footer-link {
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--font-size-400);
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: var(--bulma-primary); /* TOP-X accent color */
  text-decoration: none;
}

.footer-copy {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: var(--font-size-300);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 48rem) {
  .grok-badge {
    font-size: 1rem;
  }
  .footer-links {
    gap: var(--space-4);
    flex-direction: column;
  }
  .footer-link {
    font-size: var(--font-size-300);
  }
}

@media (max-width: 37.5rem) {
  .footer {
    padding: var(--space-9) var(--space-4) var(--space-8);
  }
}
</style>

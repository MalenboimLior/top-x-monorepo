<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-grid">
        <!-- Games Section -->
        <div class="footer-section">
          <h3 class="footer-heading">{{ t('footer.games.heading') }}</h3>
          <ul class="footer-list">
            <li><router-link to="/games" class="footer-link">{{ t('footer.games.play') }}</router-link></li>
            <li><router-link to="/games/create" class="footer-link">{{ t('footer.games.create') }}</router-link></li>
          </ul>
        </div>

        <!-- Top-X Section -->
        <div class="footer-section">
          <h3 class="footer-heading">{{ t('footer.topx.heading') }}</h3>
          <ul class="footer-list">
            <li><router-link to="/about" class="footer-link">{{ t('footer.topx.about') }}</router-link></li>
            <li><router-link to="/what-we-do" class="footer-link">{{ t('footer.topx.what') }}</router-link></li>
            <li><router-link to="/how-it-works" class="footer-link">{{ t('footer.topx.how') }}</router-link></li>
            <li><router-link to="/faq" class="footer-link">{{ t('footer.topx.faq') }}</router-link></li>
            <li><router-link to="/press" class="footer-link">{{ t('footer.topx.press') }}</router-link></li>
          </ul>
        </div>

        <!-- Legal Section -->
        <div class="footer-section">
          <h3 class="footer-heading">{{ t('footer.legal.heading') }}</h3>
          <ul class="footer-list">
            <li><router-link to="/privacy" class="footer-link">{{ t('footer.legal.privacy') }}</router-link></li>
            <li><router-link to="/terms" class="footer-link">{{ t('footer.legal.terms') }}</router-link></li>
            <li><router-link to="/cookies" class="footer-link">{{ t('footer.legal.cookies') }}</router-link></li>
            <li><router-link to="/guidelines" class="footer-link">{{ t('footer.legal.guidelines') }}</router-link></li>
            <li><router-link to="/contact" class="footer-link">{{ t('footer.legal.contact') }}</router-link></li>
            <li><router-link to="/contact?type=developer" class="footer-link">{{ t('footer.legal.developer') }}</router-link></li>
            <li><router-link to="/contact?type=advertiser" class="footer-link">{{ t('footer.legal.advertiser') }}</router-link></li>
          </ul>
        </div>

        <!-- Social Section -->
        <div class="footer-section">
          <h3 class="footer-heading">{{ t('footer.social.heading') }}</h3>
          <ul class="footer-list">
            <li>
              <a href="https://x.com/topxisrael" target="_blank" rel="noopener noreferrer" class="footer-link social-link">
                <font-awesome-icon :icon="['fab', 'x-twitter']" class="social-icon" />
                {{ t('footer.social.israel') }}
              </a>
            </li>
            <li>
              <a href="https://x.com/topxapp" target="_blank" rel="noopener noreferrer" class="footer-link social-link">
                <font-awesome-icon :icon="['fab', 'x-twitter']" class="social-icon" />
                {{ t('footer.social.app') }}
              </a>
            </li>
            <li><router-link to="/contact" class="footer-link">{{ t('footer.legal.contact') }}</router-link></li>
            <li><router-link to="/contact?type=developer" class="footer-link">{{ t('footer.legal.developer') }}</router-link></li>
            <li><router-link to="/contact?type=advertiser" class="footer-link">{{ t('footer.legal.advertiser') }}</router-link></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="footer-tagline">{{ t('footer.tagline') }}</p>
        <p class="footer-copy">© {{ currentYear }} Top-X. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

export default defineComponent({
  name: 'Footer',
  setup() {
    const localeStore = useLocaleStore();
    const t = (key: string) => localeStore.translate(key);
    const currentYear = computed(() => new Date().getFullYear());

    return { t, currentYear };
  },
});
</script>

<style scoped>
.footer {
  position: relative;
  background-color: var(--color-bg-primary);
  border-top: 1px solid var(--color-border-base);
  padding: 4rem 2rem 2rem;
  overflow: hidden;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3rem;
  margin-bottom: 3rem;
}

.footer-section {
  display: flex;
  flex-direction: column;
}

.footer-heading {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: lowercase;
  letter-spacing: 0.05em;
  color: var(--color-text-primary);
  margin: 0 0 1.25rem 0;
  opacity: 0.9;
}

.footer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.footer-link {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s ease;
  display: inline-block;
}

.footer-link:hover {
  color: var(--bulma-primary);
}

.social-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.social-icon {
  font-size: 1rem;
}

.footer-bottom {
  border-top: 1px solid var(--color-border-base);
  padding-top: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-tagline {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.footer-copy {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2.5rem;
  }
}

@media (max-width: 768px) {
  .footer {
    padding: 3rem 1.5rem 1.5rem;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .footer-section {
    text-align: left;
  }

  .footer-heading {
    margin-bottom: 1rem;
  }

  .footer-list {
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .footer {
    padding: 2.5rem 1rem 1.5rem;
  }

  .footer-grid {
    gap: 1.5rem;
  }

  .footer-bottom {
    padding-top: 1.5rem;
  }
}
</style>

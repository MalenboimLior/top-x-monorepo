<template>
  <footer class="footer has-background-dark has-text-white">
    <div class="container">
      <div class="content has-text-centered">
        <p>
           <router-link to="/about" class="grok-badge"> {{ t('footer.powered') }}</router-link>

        </p>
        <div class="footer-links">
          <router-link to="/contact" class="footer-link">{{ t('footer.terms') }}</router-link>
          <router-link to="/contact" class="footer-link">{{ t('footer.privacy') }}</router-link>
          <router-link to="/contact" class="footer-link">{{ t('footer.contact') }}</router-link>
          <a href="https://x.com/Topxapp" target="_blank" class="footer-link">
            <font-awesome-icon :icon="['fab', 'x-twitter']"  /> {{ t('footer.follow') }}
          </a>
          <!-- <a @click.prevent="manageCookies" class="footer-link" style="cursor: pointer;">
            Manage Cookie Preferences
          </a> -->
        </div>
        <p class="is-size-7 mt-2">
          {{ t('footer.copyright') }}
        </p>
      </div>
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
  background-color: var(--bulma-scheme-main); /* #121212 from dark-theme.css */
  padding: 2rem 1.5rem;
}

.grok-badge {
  color: var(--bulma-primary); /* #1da1f2 X.com blue */
  font-weight: 600;
  font-size: 1.1rem;
  transition: color 0.3s ease;
}

.grok-badge:hover {
  color: #0a85c2; /* Darker blue on hover */
  text-decoration: none;
}

.footer-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.footer-link {
  color: #bbb;
  font-size: 1rem;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #00e8e0; /* TOP-X accent color */
  text-decoration: none;
}

@media (max-width: 768px) {
  .grok-badge {
    font-size: 1rem;
  }
  .footer-links {
    gap: 1rem;
    flex-direction: column;
  }
  .footer-link {
    font-size: 0.9rem;
  }
}
</style>
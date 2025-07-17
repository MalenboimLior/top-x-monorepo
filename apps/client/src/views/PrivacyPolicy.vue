<template>
  <div class="privacy-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">Privacy Policy</h1>
          <p class="subtitle is-4 has-text-light">
            Effective Date: July 17, 2025
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="content">
          <p class="is-size-5 has-text-light">
            At TOP-X, we value your privacy. This is temporary placeholder text: We collect minimal data for authentication and gameplay, such as X login info. Data is stored securely and not shared with third parties without consent. You can request data deletion at any time.
          </p>
          <h2 class="title is-4 has-text-white">Cookies Policy</h2>
          <p class="is-size-5 has-text-light">
            We use essential cookies for core functionality (e.g., authentication, session management). With your consent, we may use analytics cookies (e.g., Firebase Analytics) to improve our services. You can manage preferences via the banner or footer link. Cookies are not shared with third parties beyond necessary service providers.
          </p>
          <p class="is-size-5 has-text-light">
            For full details, please review the complete policy (to be updated).
          </p>
          <div>
          <CustomButton
            label="Back to Home"
            type="is-primary is-large mt-5"
            @click="$router.push('/')"
          />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useHead } from '@vueuse/head';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

export default defineComponent({
  name: 'PrivacyPolicy',
  components: { CustomButton },
  setup() {
    useHead({
      title: 'TOP-X Privacy Policy',
      meta: [
        { name: 'description', content: 'Privacy Policy for the TOP-X gaming platform, including cookies.' },
      ],
    });
  },
});
</script>

<style scoped>
.privacy-page {
  background-color: #000000;
  min-height: 100vh;
  color: #ffffff;
}

.hero.is-dark {
  background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('@/assets/background-pattern.png');
  background-size: cover;
}

.section {
  padding: 3rem 1.5rem;
}

.content p {
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero-body {
    padding: 2rem 1rem;
  }
  .title.is-1 {
    font-size: 2.5rem !important;
  }
  .subtitle.is-4 {
    font-size: 1.25rem !important;
  }
}
</style>
<template>
  <div class="terms-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">Terms of Use</h1>
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
            Welcome to TOP-X. By using our platform, you agree to these terms. This is temporary placeholder text: TOP-X provides gaming services for entertainment purposes. Users must be 18+ and comply with all laws. We reserve the right to modify these terms at any time.
          </p>
          <p class="is-size-5 has-text-light">
            For full details, please review the complete terms (to be updated).
          </p>
          <CustomButton
            label="Back to Home"
            type="is-primary is-large mt-5"
            @click="$router.push('/')"
          />
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
  name: 'TermsOfUse',
  components: { CustomButton },
  setup() {
    useHead({
      title: 'TOP-X Terms of Use',
      meta: [
        { name: 'description', content: 'Terms of Use for the TOP-X gaming platform.' },
      ],
    });
  },
});
</script>

<style scoped>
.terms-page {
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
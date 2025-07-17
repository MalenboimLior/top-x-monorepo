<template>
  <div class="contact-page">
    <section class="hero is-medium is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-white">Contact Us</h1>
          <p class="subtitle is-4 has-text-light">
            We're here to help! Reach out anytime.
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="content has-text-centered">
          <p class="is-size-5 has-text-light mb-4">
            For support, questions, or feedback, email us at:
          </p>
          <a href="mailto:support@top-x.co" class="contact-link is-size-4">
            support@top-x.co
          </a>
          <p class="is-size-5 has-text-light mt-5 mb-4">
            Follow us on X for updates and community fun:
          </p>
          <a href="https://x.com/Topxapp" target="_blank" class="contact-link is-size-4">
            <font-awesome-icon :icon="['fab', 'x-twitter']" class="mr-2" /> @Topxapp
          </a>
        
        </div>
        <div>
              <CustomButton
            label="Back to Home"
            type="is-primary is-large mt-6"
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
  name: 'ContactUs',
  components: { CustomButton },
  setup() {
    useHead({
      title: 'Contact TOP-X',
      meta: [
        { name: 'description', content: 'Contact TOP-X support via email or X.' },
      ],
    });
  },
});
</script>

<style scoped>
.contact-page {
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

.contact-link {
  color: #00e8e0;
  font-weight: bold;
  text-align: center;
  transition: color 0.3s ease;
}

.contact-link:hover {
  color: #0a85c2;
  text-decoration: none;
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
  .contact-link {
    font-size: 1.25rem !important;
  }
}
</style>
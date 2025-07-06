<template>
  <footer class="footer has-background-dark has-text-white">
    <div class="container">
      <div class="content has-text-centered">
        <p>
          <a
            href="https://x.ai"
            target="_blank"
            class="grok-badge"
            title="Powered by Grok, created by xAI"
          >
            Powered by Grok with 💖
          </a>
        </p>
        <p class="is-size-7">
          &copy; 2025 TOP-X. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Footer',
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

@media (max-width: 768px) {
  .grok-badge {
    font-size: 1rem;
  }
}

</style>

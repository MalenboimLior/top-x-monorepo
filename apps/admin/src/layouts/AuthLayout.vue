<template>
  <div class="auth-layout">
    <div class="auth-layout__card box">
      <header class="auth-layout__header has-text-centered">
        <h1 class="title is-4">Top-X Admin</h1>
        <p class="subtitle is-6">Sign in to manage games and content</p>
      </header>
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #4a90e2 0%, #182848 100%);
}

.auth-layout__card {
  max-width: 24rem;
  width: 100%;
}
</style>

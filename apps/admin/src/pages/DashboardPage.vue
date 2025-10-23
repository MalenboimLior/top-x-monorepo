<template>
  <section class="section">
    <div class="container">
      <h1 class="title">Dashboard</h1>
      <p class="subtitle">Welcome back! Use the navigation to manage the Top-X experience.</p>
      <div class="columns is-multiline">
        <div class="column is-one-third" v-for="card in cards" :key="card.title">
          <div class="card">
            <header class="card-header">
              <p class="card-header-title">
                <span class="icon-text">
                  <span class="icon"><font-awesome-icon :icon="card.icon" aria-hidden="true" /></span>
                  <span>{{ card.title }}</span>
                </span>
              </p>
            </header>
            <div class="card-content">
              <p class="content">{{ card.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const cards = [
  {
    title: 'Game Types',
    description: 'Create, edit, and organize the templates that power the experience.',
    icon: 'layer-group',
  },
  {
    title: 'Games',
    description: 'Launch new games, monitor progress, and keep track of status updates.',
    icon: 'gamepad',
  },
  {
    title: 'Communications',
    description: 'Plan social posts and announcements to engage the community.',
    icon: 'bullhorn',
  },
];
</script>

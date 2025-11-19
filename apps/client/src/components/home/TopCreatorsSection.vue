<template>
  <section class="top-creators layout-container section-stack">
    <header class="section-header">
      <div class="section-header__content">
        <h2 class="section-title">{{ title }}</h2>
        <p class="section-subtitle">{{ subtitle }}</p>
      </div>
    </header>
    <ul class="top-creators__list">
      <li
        v-for="(creator, index) in creators"
        :key="creator.uid"
        class="top-creators__item"
      >
        <button class="top-creators__avatar" type="button" @click="$emit('open-profile', creator.uid)">
          <img :src="creator.photoURL" :alt="creator.displayName" />
          <span class="top-creators__badge">
            <span class="top-creators__medal">🏅</span>
            <span class="top-creators__rank">#{{ index + 1 }}</span>
          </span>
        </button>
        <div class="top-creators__meta">
          <span class="top-creators__name">{{ creator.displayName }}</span>
          <span class="top-creators__username" v-if="creator.username">{{ creator.username }}</span>
        </div>
      </li>
      <li class="top-creators__item top-creators__item--placeholder">
        <div class="top-creators__avatar top-creators__avatar--placeholder" aria-hidden="true">
          <span class="top-creators__placeholder-text">?</span>
        </div>
        <div class="top-creators__meta">
          <span class="top-creators__name">This spot can be yours!</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
interface CreatorEntry {
  uid: string;
  displayName: string;
  username?: string;
  photoURL: string;
}

defineProps<{
  title: string;
  subtitle: string;
  creators: CreatorEntry[];
}>();

defineEmits<{
  (e: 'open-profile', uid: string): void;
}>();
</script>

<style scoped>
.top-creators {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0 1rem;
}

.top-creators__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.top-creators__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.top-creators__avatar {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(0, 232, 224, 0.35);
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.top-creators__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.top-creators__badge {
  position: absolute;
  right: -6px;
  bottom: -6px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: #111827;
  color: #f9fafb;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.top-creators__medal {
  display: inline-block;
}

.top-creators__rank {
  font-weight: 700;
  font-size: 0.85rem;
}

.top-creators__meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.top-creators__name {
  font-weight: 600;
  text-align: center;
}

.top-creators__username {
  font-size: 0.85rem;
  color: rgba(60, 60, 67, 0.75);
}

.top-creators__item--placeholder .top-creators__name {
  color: rgba(60, 60, 67, 0.8);
}

.top-creators__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-secondary);
  border: 3px dashed var(--color-border-base);
}

.top-creators__placeholder-text {
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

@media (max-width: 640px) {
  .top-creators__list {
    grid-template-columns: repeat(3, 1fr);
  }
  .top-creators__avatar {
    width: 80px;
    height: 80px;
  }
}
</style>



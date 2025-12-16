<template>
  <section class="top-creators layout-container section-stack" :class="{ 'is-rtl': isRTL }">
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
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

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

const localeStore = useLocaleStore();
const isRTL = computed(() => localeStore.direction === 'rtl');
</script>

<style scoped>
.top-creators {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.top-creators.is-rtl {
  direction: rtl;
}

.section-header__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(0.3rem, 0.8vw, 0.45rem);
  padding-block: clamp(0.8rem, 2vw, 1.2rem);
  padding-inline: 0;
  background: transparent;
  text-align: start;
}

.section-header__content::before,
.section-header__content::after {
  display: none; /* Removed for flat design */
}

.section-title {
  margin: 0;
  font-size: clamp(1.5rem, 1.2vw + 1.5rem, 3rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.section-subtitle {
  margin: 0;
  font-size: clamp(1rem, 0.9vw + 1rem, 1.5rem);
  color: var(--color-text-secondary);
  font-weight: 500;
  max-width: 36rem;
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
  border: 3px solid var(--color-border-primary);
  padding: 0;
  background: var(--color-bg-surface);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.top-creators__avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px var(--color-primary-bg-hover);
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
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: 999px;
  box-shadow: var(--bulma-shadow);
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
  color: var(--color-text-secondary);
}

.top-creators__item--placeholder .top-creators__name {
  color: var(--color-text-muted);
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
  color: var(--color-text-disabled);
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



<template>
  <button class="button" :class="type" @click="$emit('click')">
     <span>{{ label }} </span>&nbsp;
    <font-awesome-icon v-if="icon" :icon="icon" class="button-icon" />
  </button>
</template>

<script setup lang="ts">
interface Props {
  type: string;
  label: string;
  icon?: string[] | string; // Supports Font Awesome icon array (e.g., ['fab', 'x-twitter'])
}

defineProps<Props>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
@import '../styles/CustomButton.css';

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.button-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}
</style>
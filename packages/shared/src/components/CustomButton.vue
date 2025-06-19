<!-- Reusable button with optional icon styling -->
<template>
  <button :class="['button', type]" :disabled="disabled" @click="$emit('click')">
    <span v-if="icon" class="icon">
      <i :class="['fa', ...icon]"></i>
    </span>
    <span><slot>{{ label }}</slot></span>
  </button>
</template>

<script setup lang="ts">
// A reusable button component with optional icon and styling.
defineProps<{
  type?: string;
  label?: string;
  icon?: string[];
  disabled?: boolean;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
/* Basic styling that can be overridden by passing a Bulma type */
.button {
  border-radius: 6px;
  font-weight: 500;
}
</style>
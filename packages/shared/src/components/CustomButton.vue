<template>
  <button :class="['button', type]">
    <span v-if="icon" class="icon">
      <font-awesome-icon :icon="icon" />
    </span>
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  type: string
  label: string
  icon?: [string, string]
}>()
</script>

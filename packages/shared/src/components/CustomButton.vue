<template>
  <button :class="['button', type]">
   
    <span>{{ label }}</span>
    <span v-if="icon" class="icon">
      <font-awesome-icon :icon="icon" />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  type: string
  label: string
  icon?: [string, string]
}>()
</script>

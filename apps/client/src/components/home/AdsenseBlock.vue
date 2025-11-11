<template>
  <div
    ref="rootRef"
    class="adsense-block"
    role="complementary"
    :aria-label="t('home.ads.label')"
  >
    <ins
      class="adsbygoogle"
      style="display:block; width: 100%; min-height: 250px;"
      :data-ad-client="client"
      :data-ad-slot="slot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';

interface Props {
  client: string;
  slot: string;
}

defineProps<Props>();

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const rootRef = ref<HTMLElement | null>(null);

defineExpose({ el: rootRef });
</script>

<style scoped>
.adsense-block {
  width: 100%;
  margin: clamp(var(--space-7), 6vh, var(--space-9)) auto;
  padding: var(--space-4);
  border-radius: 24px;
  border: 1px solid rgba(0, 232, 224, 0.16);
  background: rgba(0, 0, 0, 0.55);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

.adsense-block:empty {
  display: none;
}

@media (max-width: 48rem) {
  .adsense-block {
    padding: var(--space-3);
  }
}
</style>


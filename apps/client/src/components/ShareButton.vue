<template>
  <div class="share-button-container">
    <CustomButton 
      class="share-button"
      :type="buttonType || 'is-primary'"
      :label="label ?? t('common.share')"
      :icon="['fas', 'share']"
      :disabled="!isShareSupported && !isAndroid"
      @click="handleShare"
    />
    <div v-if="showShareTooltip" class="share-tooltip">
        {{ t('gameInfo.shareSuccess') || 'Nailed it! Image saved & Text copied! 🚀' }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed,ref} from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { useLocaleStore } from '@/stores/locale';

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const showShareTooltip = ref(false);

const props = defineProps<{
  shareText: string;
  imageUrl: string | null;
  fileName?: string;
  label?: string;
  buttonType?: string;
}>();

// Check if Web Share API is supported
const isShareSupported = computed(() => !!navigator.share && !!navigator.canShare);

// Detect Android for fallback
const isAndroid = computed(() => /Android/i.test(navigator.userAgent));
const isIOS = computed(() => /iPad|iPhone|iPod/i.test(navigator.userAgent));
const isMobile = computed(() => isAndroid.value || isIOS.value);

const handleShare = async () => {
  if (!props.imageUrl) {
    console.error('ShareButton: No image URL provided');
    //alert('Cannot share: No image available.');
    return;
  }

  try {
    const blob = await (await fetch(props.imageUrl)).blob();
    const filename = `${(props.fileName || 'top-x-share')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')}.png`;
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    
    if (isMobile.value && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
      await navigator.clipboard.writeText(props.shareText);
    } catch (clipErr) {
      console.warn('Clipboard write failed (ignored):', clipErr);
    }

    await navigator.share({
      files: [file],
      text: props.shareText,
      title: 'TOP-X Pyramid Share'
    });
      console.log('Shared successfully');
      return;
    }

    // Desktop or fallback behaviour
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    try {
      await navigator.clipboard.writeText(props.shareText);
      console.log('Clipboard copy successful');
      showShareTooltip.value = true;
      setTimeout(() => {
        showShareTooltip.value = false;
      }, 5000);

      //alert('Image downloaded and text copied to clipboard.');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
     // alert('Image downloaded. Copy this text for your post: ' + props.shareText);
    }
  } catch (error) {
    console.error('Share failed:', error);
    //alert('Failed to share. Please try again.');
  }
};
</script>

<style scoped>
.share-button-container {
  position: relative;
  display: inline-block;
}
.share-button {
  margin: 0;
  min-width: 50px;
}
.share-tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bulma-primary);
  color: #000;
  padding: var(--space-2) var(--space-4);
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  z-index: 20;
  box-shadow: 0 10px 25px rgba(0, 232, 224, 0.4);
  pointer-events: none;
}
.share-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--bulma-primary);
}
</style>
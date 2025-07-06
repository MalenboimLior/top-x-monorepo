<template>
  <CustomButton
    class="share-button"
    type="is-primary"
    label="Share to X"
    :icon="['fab', 'x-twitter']"
    :disabled="!isShareSupported && !isAndroid"
    @click="handleShare"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const props = defineProps<{
  shareText: string;
  imageUrl: string | null;
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
    alert('Cannot share: No image available.');
    return;
  }

  try {
    const blob = await (await fetch(props.imageUrl)).blob();
    const file = new File([blob], 'top-x-pyramid.png', { type: blob.type || 'image/png' });

    if (isMobile.value && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: props.shareText });
      console.log('Shared successfully');
      return;
    }

    // Desktop or fallback behaviour
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'top-x-pyramid.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    try {
      await navigator.clipboard.writeText(props.shareText);
      alert('Image downloaded and text copied to clipboard.');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      alert('Image downloaded. Copy this text for your post: ' + props.shareText);
    }
  } catch (error) {
    console.error('Share failed:', error);
    alert('Failed to share. Please try again.');
  }
};
</script>

<style scoped>
.share-button {
  margin: 0.5rem;
}
</style>
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
import html2canvas from 'html2canvas';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const props = defineProps<{
  shareText: string;
  canvasElement: HTMLElement | null; // Allow null to fix TypeScript error
}>();

// Check if Web Share API is supported
const isShareSupported = computed(() => !!navigator.share && !!navigator.canShare);

// Detect Android for fallback
const isAndroid = computed(() => /Android/i.test(navigator.userAgent));

const handleShare = async () => {
  if (!props.canvasElement) {
    console.error('ShareButton: No canvas element provided');
    alert('Cannot share: No content to capture.');
    return;
  }

  try {
    // For Android, prefer fallback due to inconsistent Web Share API support
    if (isAndroid.value) {
      await tryAndroidFallback();
      return;
    }
      
    // Generate image from canvas element
    const canvas = await html2canvas(props.canvasElement, {
      backgroundColor: '#000000', // Match TOP-X dark theme
      scale: 2, // Improve image quality
    });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );

    if (!blob) {
      throw new Error('Failed to generate image from canvas');
    }

    // Create a File object for sharing
    const file = new File([blob], 'top-x-pyramid.png', { type: 'image/png' });

    // // Share data
    // const shareData: ShareData = {
    //   text: props.shareText,
    //   files: [file],
    // };

    // Verify if share data can be shared
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
     await navigator.share({
          files: [file],
         // title: shareTitle,
          text: props.shareText,
        });
      console.log('Shared successfully to X');
    } else {
      throw new Error('Sharing not supported for this data');
    }
  } catch (error) {
    console.error('Share failed:', error);
    await tryAndroidFallback();
  }
};

const tryAndroidFallback = async () => {
  if (!props.canvasElement) {
    console.error('ShareButton: No canvas element provided in fallback');
    alert('Cannot share: No content to capture.');
    return;
  }

  try {
    // Generate image blob
    const canvas = await html2canvas(props.canvasElement, {
      backgroundColor: '#000000',
      scale: 2,
    });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );

    if (!blob) {
      throw new Error('Failed to generate image');
    }

    // Download image
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'top-x-pyramid.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Open X with pre-filled text
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(props.shareText)}`;
    window.open(xUrl, '_blank');

    // Prompt user
    alert(
      'Image downloaded! Please open the X app, create a post with the downloaded image, and use this text: ' +
        props.shareText
    );
  } catch (error) {
    console.error('Android fallback failed:', error);
    alert('Failed to share. Please try again or share manually.');
  }
};
</script>

<style scoped>
.share-button {
  margin: 0.5rem;
}
</style>
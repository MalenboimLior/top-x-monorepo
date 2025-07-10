<template>
  <div class="share-button-container">
    <CustomButton 
      class="share-button"
      type="is-primary"
      label="Share"
      :icon="['fas', 'share']"
      :disabled="!isShareSupported && !isAndroid"
      @click="handleShare"
    />
    <div v-if="showShareTooltip" class="share-tooltip">
        Share text copied to clipboard!
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed,ref} from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
const showShareTooltip = ref(false);

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
    //alert('Cannot share: No image available.');
    return;
  }

  try {
    const blob = await (await fetch(props.imageUrl)).blob();
    const file = new File([blob], 'top-x-pyramid.png', { type: blob.type || 'image/png' });
    
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
    link.download = 'top-x-pyramid.png';
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
      }, 3000);

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
  margin: 0.5rem;
  width: 140px;
}
.share-tooltip {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #3273dc;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  white-space: nowrap;
  z-index: 20;
}
</style>
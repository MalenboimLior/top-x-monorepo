<template>
  <Teleport to="body">
    <div v-if="show" class="advanced-share-overlay" :class="{ 'is-rtl': isRtl }" @click="closePopup">
      <div class="advanced-share-popup" @click.stop>
        <!-- Decorative background elements -->
        <div class="bg-glow bg-glow-1"></div>
        <div class="bg-glow bg-glow-2"></div>

        <!-- Close button -->
        <button class="close-btn" @click="closePopup" :aria-label="t('common.close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>

        <div class="popup-header">
          <h3 class="gradient-text">{{ t('games.pyramid.advancedShare') }}</h3>
          <p class="header-subtitle">{{ t('games.pyramid.advancedShare.shareTextPlaceholder') }}</p>
        </div>

        <div class="popup-content">
          <!-- Step 1: Download Image (HIDDEN ON IPHONE) -->
          <div v-if="!isIPhone" class="share-step">
            <div class="step-badge">1</div>
            <div class="step-body">
              <h4 class="step-title">{{ t('games.pyramid.advancedShare.step1') }}</h4>
              <button class="action-btn download-btn ripple" @click="downloadImage">
                <font-awesome-icon :icon="['fas', 'download']" />
                <span>{{ t('games.pyramid.downloadImage') }}</span>
              </button>
            </div>
          </div>

          <!-- Step 2: Copy Share Text / Native Share -->
          <div class="share-step">
            <div class="step-badge">{{ isIPhone ? 1 : 2 }}</div>
            <div class="step-body">
              <h4 class="step-title">
                {{ isIPhone ? t('games.pyramid.advancedShare.iphone.step2Title') : t('games.pyramid.advancedShare.step2') }}
              </h4>
              <div class="input-container">
                <div class="input-header ltr-box">
                  <span class="input-label">Share Text</span>
                  <button 
                    class="copy-action-btn" 
                    :class="{ 'copied': shareTextCopied }"
                    @click="copyToClipboard(editableShareText, 'shareText')"
                  >
                    <font-awesome-icon :icon="shareTextCopied ? ['fas', 'check'] : ['fas', 'copy']" />
                    <span>{{ shareTextCopied ? 'Copied' : 'Copy Text' }}</span>
                  </button>
                </div>
                <textarea
                  v-model="editableShareText"
                  class="premium-textarea"
                  rows="7"
                  :placeholder="t('games.pyramid.advancedShare.shareTextPlaceholder')"
                ></textarea>
              </div>
              <div class="step-actions">
                <!-- Native Share for iPhone, Direct X intent for others -->
                <button v-if="isIPhone" class="social-btn x-btn" @click="handleNativeShare">
                  <font-awesome-icon :icon="['fab', 'x-twitter']" />
                  {{ t('games.pyramid.advancedShare.iphone.nativeShare') }}
                </button>
                <button v-else class="social-btn x-btn" @click="shareOnX(editableShareText)">
                  <font-awesome-icon :icon="['fab', 'x-twitter']" />
                  {{ t('games.pyramid.advancedShare.shareOnX') }}
                </button>
                
                <p class="hint-text">
                  <font-awesome-icon :icon="['fas', 'circle-info']" />
                  {{ isIPhone ? t('games.pyramid.advancedShare.iphone.step2Comment') : t('games.pyramid.advancedShare.dontForgetImage') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Step 4 (Optional): Xusers List -->
          <div v-if="isXusersType" class="share-step animation-fade-in">
            <div class="step-badge">{{ isIPhone ? 2 : 3 }}</div>
            <div class="step-body">
              <h4 class="step-title">{{ t('games.pyramid.advancedShare.step4') }}</h4>
              <div class="input-container ltr-box">
                <div class="input-header ltr-box">
                  <span class="input-label">X Users</span>
                  <button 
                    class="copy-action-btn" 
                    :class="{ 'copied': xusersCopied }"
                    @click="copyToClipboard(xusersText, 'xusers')"
                  >
                    <font-awesome-icon :icon="xusersCopied ? ['fas', 'check'] : ['fas', 'copy']" />
                    <span>{{ xusersCopied ? 'Copied' : 'Copy Text' }}</span>
                  </button>
                </div>
                <textarea
                  v-model="xusersText"
                  class="premium-textarea mini-textarea"
                  rows="2"
                  readonly
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Step 3: Game Link -->
          <div class="share-step">
            <div class="step-badge">
              {{ isIPhone ? (isXusersType ? 3 : 2) : (isXusersType ? 4 : 3) }}
            </div>
            <div class="step-body">
              <h4 class="step-title">{{ t('games.pyramid.advancedShare.step3') }}</h4>
              <div class="input-container ltr-box">
                <div class="input-header ltr-box">
                  <span class="input-label">Game Link</span>
                  <button 
                    class="copy-action-btn" 
                    :class="{ 'copied': shareLinkCopied }"
                    @click="copyToClipboard(shareLink, 'link')"
                  >
                    <font-awesome-icon :icon="shareLinkCopied ? ['fas', 'check'] : ['fas', 'copy']" />
                    <span>{{ shareLinkCopied ? 'Copied' : 'Copy Link' }}</span>
                  </button>
                </div>
                <div class="premium-link-box">
                  <span class="link-url">{{ shareLink }}</span>
                </div>
              </div>
              <p class="hint-text mt-1">
                <font-awesome-icon :icon="['fas', 'link']" />
                {{ t('games.pyramid.advancedShare.addLinkToThread') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faXmark, faShare, faFileImage, faCheck, faDownload, faCopy, faCircleInfo, faLink } from '@fortawesome/free-solid-svg-icons';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { useLocaleStore } from '@/stores/locale';

library.add(faXmark, faShare, faFileImage, faCheck, faDownload, faCopy, faCircleInfo, faLink, faXTwitter);

const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);
const isRtl = computed(() => localeStore.language === 'il');
const isIPhone = computed(() => /iPhone|iPod/i.test(navigator.userAgent));

const props = defineProps<{
  show: boolean;
  pyramid: any[][];
  gameType?: 'basic' | 'Xusers';
  shareText: string;
  shareLink: string;
  imageUrl: string | null;
  worstItem?: any;
  gameId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const editableShareText = ref('');
const xusersText = ref('');
const shareLinkCopied = ref(false);
const shareTextCopied = ref(false);
const xusersCopied = ref(false);

const isXusersType = computed(() => props.gameType === 'Xusers');

// Generate X users text
const generateXusersText = () => {
  if (!isXusersType.value) return '';

  const users = new Set<string>();
  props.pyramid.forEach(row => {
    row.forEach(slot => {
      if (slot?.image?.name) {
        users.add(slot.image.name);
      }
    });
  });

  if (props.worstItem?.name) {
    users.add(props.worstItem.name);
  }

  return Array.from(users)
    .filter(Boolean)
    .map(user => `@${user}`)
    .join(', ');
};

const closePopup = () => {
  emit('close');
};

const downloadImage = async () => {
  if (!props.imageUrl) return;

  try {
    const response = await fetch(props.imageUrl);
    const blob = await response.blob();
    const filename = `pyramid-${props.gameId}.png`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
};

const copyToClipboard = async (text: string, type: 'shareText' | 'xusers' | 'link' = 'shareText') => {
  try {
    await navigator.clipboard.writeText(text);

    // Set copied state based on type
    if (type === 'shareText') {
      shareTextCopied.value = true;
      setTimeout(() => shareTextCopied.value = false, 2000);
    } else if (type === 'xusers') {
      xusersCopied.value = true;
      setTimeout(() => xusersCopied.value = false, 2000);
    } else if (type === 'link') {
      shareLinkCopied.value = true;
      setTimeout(() => shareLinkCopied.value = false, 2000);
    }
  } catch (error) {
    console.error('Copy failed:', error);
  }
};

const shareOnX = (text: string) => {
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

const handleNativeShare = async () => {
  if (!props.imageUrl) return;

  try {
    const response = await fetch(props.imageUrl);
    const blob = await response.blob();
    const filename = `pyramid-${props.gameId}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        text: editableShareText.value,
        title: 'TOP-X Pyramid Share'
      });
    } else {
      // Fallback to regular X share if native share fails
      shareOnX(editableShareText.value);
    }
  } catch (error) {
    console.error('Native share failed:', error);
    shareOnX(editableShareText.value);
  }
};

watch(() => props.show, (newShow) => {
  if (newShow) {
    editableShareText.value = props.shareText;
    xusersText.value = generateXusersText();
  }
});

watch(() => props.shareText, (newText) => {
  if (props.show) {
    editableShareText.value = newText;
  }
});

onMounted(() => {
  editableShareText.value = props.shareText;
  xusersText.value = generateXusersText();
});
</script>

<style scoped>
.advanced-share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(12px);
  padding: 1.5rem; /* Increased padding to ensure it doesn't touch edges */
}

.advanced-share-overlay * {
  box-sizing: border-box;
}

.advanced-share-popup {
  background: #0f0f0f;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  animation: popupReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popupReveal {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* RTL Support */
.is-rtl {
  direction: rtl;
}

.is-rtl .close-btn {
  right: auto;
  left: 1.25rem;
}

.is-rtl .step-badge {
  margin-right: 0;
  margin-left: 1.25rem;
}

.bg-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}

.bg-glow-1 {
  top: -50px;
  right: -50px;
  background: #00e8e0;
}

.bg-glow-2 {
  bottom: -50px;
  left: -50px;
  background: #1da1f2;
}

.close-btn {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: rotate(90deg);
}

.popup-header {
  padding: 2rem 2rem 1.5rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.gradient-text {
  background: linear-gradient(135deg, #fff 0%, #00e8e0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.header-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  margin: 0;
}

.popup-content {
  padding: 0 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  position: relative;
  z-index: 1;
}

.share-step {
  display: flex;
  align-items: flex-start;
}

.step-badge {
  background: linear-gradient(135deg, #00e8e0 0%, #1da1f2 100%);
  color: #000;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.85rem;
  flex-shrink: 0;
  margin-right: 1.25rem;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.4);
}

.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.action-btn {
  width: 100%;
  padding: 0.875rem;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-btn {
  background: rgba(0, 232, 224, 0.15);
  color: #00e8e0;
  border: 1px solid rgba(0, 232, 224, 0.3);
}

.download-btn:hover {
  background: rgba(0, 232, 224, 0.25);
  border-color: #00e8e0;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 232, 224, 0.2);
}

.input-group {
  position: relative;
  width: 100%;
}

.input-container {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  margin-top: 0.25rem;
}

.input-container:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.input-container:focus-within {
  border-color: rgba(0, 232, 224, 0.4);
  background: rgba(255, 255, 255, 0.04);
}

.input-header {
  background: rgba(255, 255, 255, 0.04);
  padding: 0.6rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.input-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  user-select: none;
}

.copy-action-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.copy-action-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.copy-action-btn.copied {
  color: #00e8e0;
}

.premium-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: #fff;
  padding: 1rem;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
  display: block;
}

.premium-textarea:focus {
  outline: none;
}

.mini-textarea {
  padding: 0.75rem 1rem;
}

.premium-link-box {
  width: 100%;
  background: transparent;
  padding: 1rem;
  overflow: hidden;
}

.link-url {
  color: #1da1f2;
  font-family: monospace;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.ltr-box {
  direction: ltr !important;
  text-align: left !important;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.social-btn {
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  border: none;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.x-btn {
  background: #fff;
  color: #000;
}

.x-btn:hover {
  background: #e5e5e5;
  transform: translateY(-1px);
}

.hint-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mt-1 { margin-top: 0.5rem; }

/* Custom Scrollbar */
.advanced-share-popup::-webkit-scrollbar {
  width: 6px;
}

.advanced-share-popup::-webkit-scrollbar-track {
  background: transparent;
}

.advanced-share-popup::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.premium-textarea::-webkit-scrollbar {
  width: 4px;
}

.premium-textarea::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

@media (max-width: 640px) {
  .advanced-share-popup {
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }
  
  .popup-header {
    padding: 3rem 1.5rem 1.5rem;
  }

  .popup-content {
    padding: 0 1.5rem 2rem;
    gap: 1.5rem;
  }

  .step-badge {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
    margin-right: 1rem;
  }

  .is-rtl .step-badge {
    margin-left: 1rem;
  }

  .gradient-text {
    font-size: 1.5rem;
  }
}

.animation-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

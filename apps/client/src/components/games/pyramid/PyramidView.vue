<template>
  <div class="pyramid-view">
    <div class="pyramid-container p-2">
      <div class="content-wrapper">
        <!-- Brand Header -->
        <div class="header-section">
          <div class="brand-row">
            <img :src="props.userProfile?.photoURL || defaultProfile" class="user-image" />
            <img :src="topxLogo" class="logo" />
          </div>
          <h1 class="game-title" v-html="props.shareImageTitle || props.gameHeader || 'Top Ranking'"></h1>
          <p v-if="props.userName" class="game-subtitle">By {{ props.userName.startsWith('@') ? props.userName : '@' + props.userName }}</p>
        </div>


        <!-- Pyramid -->
        <div class="pyramid">
          <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
            <!-- <div class="row-label has-text-white" v-if="!hideRowLabel">
              {{ rows[rowIndex]?.label || toRoman(rowIndex + 1) }}
            </div> -->
            <div class="pyramid-row">
              <div v-for="(slot, colIndex) in row" :key="colIndex" class="pyramid-slot">
                <div class="hex-outer" :class="{ 'has-image': slot.image }">
                  <div class="hex-border" :style="{ background: slot.image?.color || '' }"></div>
                  <div class="hex-inner">
                    <div v-if="slot.image" class="slot-style">
                      <img
                        :src="slot.image.src"
                        :alt="slot.image.label"
                        class="draggable-image"
                        crossorigin="anonymous"
                      />
                    </div>
                    <div v-else class="tier-label"></div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Worst Item -->
        <div class="worst-item-container" v-if="props.worstShow !== false">
          <h3 class="worst-title">{{ worstHeader || 'The Worst' }}</h3>
          <div class="hex-outer worst" :class="{ 'has-image': worstItem }">
            <div class="hex-border"></div>
            <div class="hex-inner">
              <div v-if="worstItem" class="slot-style">
                <img
                  :src="worstItem.src"
                  :alt="worstItem.label"
                  class="draggable-image"
                  crossorigin="anonymous"
                />
              </div>
              <div v-else class="tier-label has-text-danger">!</div>
            </div>
           
          </div>
        </div>
        <!-- Top-X Label / Footer -->
        <div class="footer-section">
          <p class="cta-text">And what's your vote?</p>
          <p class="link-text">{{ props.shareLink || 'top-x.co' }}</p>
        </div>
      </div>
    </div>
  
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { PyramidItem, PyramidRow, PyramidSlot } from '@top-x/shared/types/pyramid';
import topxLogo from '@/assets/topx-logo.png';

const props = defineProps<{
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
  rows: PyramidRow[];
  gameHeader?: string;
  worstHeader?: string;
  gameTitle?: string;
  hideRowLabel?: boolean;
  shareImageTitle?: string;
  shareText?: string;
  shareLink?: string;
  worstShow?: boolean;
  userProfile?: { photoURL: string };
  userName?: string;
}>();

import defaultProfile from '@/assets/profile.png';

const pyramidImages = ref<HTMLImageElement[]>([]);
const worstImage = ref<HTMLImageElement | null>(null);
const isImageLoading = ref(true);

onMounted(async () => {
  await nextTick();
});

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}
</script>

<style scoped>
.pyramid-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.pyramid-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0c0c0c 100%);
  padding: 3rem 1.5rem;
  box-sizing: border-box;
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.content-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Header Styles */
.header-section {
  text-align: center;
  /*margin-bottom: 2rem;*/
  width: 100%;
}
.brand-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1.5rem;
}
.user-image {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #00e8e0;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.3);
}
.logo {
  width: 80px;
}
.game-title :deep(span) {
  color: #00e8e0;
}
.game-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.8rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0.5rem 0;
  color: #fff;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  line-height: 1.2;
}
.game-subtitle {
  font-size: 0.9rem;
  color: #00e8e0;
  letter-spacing: 4px; /* Reduced for better name readability */
  margin-bottom: 10px;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.9;
}

.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.pyramid-row-container {
  margin-top: -18px; 
}
.pyramid-row-container:first-child {
  margin-top: 0;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 6px; /* Tighter horizontal gap */
}

/* Hexagon Base */
.hex-outer {
  width: 75px;
  height: 86px;
  position: relative;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hex-border {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #00e8e0;
  z-index: 1;
}
.hex-inner {
  width: calc(100% - 6px); /* Thicker border */
  height: calc(100% - 6px);
  background: #0c0c0c;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  z-index: 2;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-tag {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: #00e8e0;
  z-index: 10;
  box-shadow: 0 0 5px rgba(0, 232, 224, 0.4);
}

.draggable-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tier-label {
  color: rgba(255, 255, 255, 0.2);
  font-size: 1.5rem;
  font-weight: 900;
}

.worst-item-container {
  margin-top: 1px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.worst-title {
  font-size: 0.9rem;
  color: #ff5555;
  text-transform: uppercase;
  letter-spacing: 3px;
  
  font-weight: 700;
}
.hex-outer.worst .hex-border {
  background: rgba(255, 85, 85, 0.2);
}
.hex-outer.worst.has-image .hex-border {
  background: linear-gradient(135deg, #ff5555, rgba(255, 85, 85, 0.3));
}
.hex-outer.worst .rank-tag {
  color: #ff5555;
  border-color: rgba(255, 85, 85, 0.4);
}

/* Footer Styles */
.footer-section {
  margin-top: 5px;
  text-align: center;
  width: 100%;
}
.cta-text {
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 0.8rem;
  color: #fff;
}
.link-text {
  font-size: 0.9rem;
  font-weight: 700;
  color: #00e8e0;
  background: rgba(0, 232, 224, 0.1);
  padding: 4px 16px;
  border-radius: 20px;
  display: inline-block;
  border: 1px solid rgba(0, 232, 224, 0.2);
}

@media screen and (max-width: 767px) {
  .pyramid-container {
    padding: 2rem 1rem;
  }
  .game-title {
    font-size: 1.4rem;
  }
  .user-image {
    width: 40px;
    height: 40px;
  }
  .logo {
    width: 60px;
  }
  .hex-outer {
    width: 65px;
    height: 75px;
  }
  .pyramid-row-container {
    margin-top: -15px;
  }
  .pyramid-row {
    gap: 3px;
  }
  .pyramid {
    gap: 0;
  }
}
</style>
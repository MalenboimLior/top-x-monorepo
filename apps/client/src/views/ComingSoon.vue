<template>
  <div class="coming-soon-container">
    <img src="@/assets/topx-logo.png" alt="TOP-X Logo" class="topx-logo" />
    <h1 class="title has-text-success">TOP-X is Coming Soon!</h1>
    <p class="subtitle has-text-grey-light">Get ready to rank, play, and compete with friends!</p>
    <div class="timer-container">
      <div class="timer-box" :class="{ bounce: animateDays }">
        <div class="timer-value">{{ days }}</div>
        <div class="timer-label">Days</div>
      </div>
      <div class="timer-box" :class="{ bounce: animateHours }">
        <div class="timer-value">{{ hours }}</div>
        <div class="timer-label">Hours</div>
      </div>
      <div class="timer-box" :class="{ bounce: animateMinutes }">
        <div class="timer-value">{{ minutes }}</div>
        <div class="timer-label">Minutes</div>
      </div>
      <div class="timer-box" :class="{ bounce: animateSeconds }">
        <div class="timer-value">{{ seconds }}</div>
        <div class="timer-label">Seconds</div>
      </div>
    </div>
    <a href="https://x.com/Topxapp" target="_blank" class="follow-button is-primary">
      <font-awesome-icon :icon="['fab', 'x-twitter']" class="mr-2" />
      Follow @Topxapp on X
    </a>    
    <div class="background-particles"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useHead } from '@vueuse/head';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const days = ref(0);
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
const animateDays = ref(false);
const animateHours = ref(false);
const animateMinutes = ref(false);
const animateSeconds = ref(false);

// Set meta tags for SEO
useHead({
  title: 'TOP-X - Coming Soon',
  meta: [
    {
      name: 'description',
      content: 'TOP-X is coming soon! Get ready to play, rank, and compete with friends.',
    },
  ],
});

// Countdown timer logic
const updateTimer = () => {
  const launchDate = new Date('2025-07-16T00:00:00'); // Set to August 5, 2025
  const now = new Date();
  const diff = launchDate.getTime() - now.getTime();

  if (diff <= 0) {
    days.value = 0;
    hours.value = 0;
    minutes.value = 0;
    seconds.value = 0;
    return;
  }

  const newDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const newHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const newMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const newSeconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Trigger bounce animation on change
  if (newSeconds !== seconds.value) {
    animateSeconds.value = true;
    setTimeout(() => (animateSeconds.value = false), 200);
  }
  if (newMinutes !== minutes.value) {
    animateMinutes.value = true;
    setTimeout(() => (animateMinutes.value = false), 200);
  }
  if (newHours !== hours.value) {
    animateHours.value = true;
    setTimeout(() => (animateHours.value = false), 200);
  }
  if (newDays !== days.value) {
    animateDays.value = true;
    setTimeout(() => (animateDays.value = false), 200);
  }

  days.value = newDays;
  hours.value = newHours;
  minutes.value = newMinutes;
  seconds.value = newSeconds;
};

onMounted(() => {
  updateTimer();
  setInterval(updateTimer, 1000);
  logEvent(analytics, 'page_view', {
    page_path: '/coming-soon',
    page_title: 'Coming Soon',
  });
});
</script>

<style scoped>
.coming-soon-container {
  text-align: center;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  border: 2px solid #00e8e0;
  box-shadow: 0 0 20px rgba(0, 232, 224, 0.3);
  position: relative;
  z-index: 1;
}
.topx-logo {
  width: 150px;
  margin-bottom: 2rem;
  animation: pulse 2s infinite ease-in-out;
}
.title {
  color: #00e8e0;
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(0, 232, 224, 0.5);
}
.subtitle {
  color: #bbb;
  font-size: 1.2rem;
  margin-bottom: 2rem;
}
.timer-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}
.timer-box {
  background: #1f1f1f;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #00e8e0;
  min-width: 80px;
  text-align: center;
  transition: transform 0.2s;
}
.timer-box.bounce {
  transform: scale(1.1);
}
.timer-value {
  font-size: 2rem;
  font-weight: bold;
  color: #00e8e0;
}
.timer-label {
  font-size: 0.9rem;
  color: #bbb;
}
.follow-button {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.3s;
}
.follow-button:hover {
  transform: scale(1.05);
}
.background-particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(circle, rgba(0, 232, 224, 0.1) 0%, transparent 70%);
  animation: gradientShift 15s infinite linear;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@media (max-width: 767px) {
  .coming-soon-container { padding: 1rem; }
  .title { font-size: 1.8rem; }
  .subtitle { font-size: 1rem; }
  .timer-box { min-width: 60px; padding: 0.5rem; }
  .timer-value { font-size: 1.5rem; }
  .timer-label { font-size: 0.8rem; }
  .topx-logo { width: 100px; }
}
</style>
<template>
  <div :class="['game-login-promo', mode, { 'is-visible': isVisible }]">
    <div class="content-wrapper" @click.stop>
      <h3 class="promo-title">
        {{ title || t('games.promo.title') }}
      </h3>
      
      <p class="promo-subtitle">
        {{ subtitle || t('games.promo.subtitle') }}
      </p>

      <p class="promo-link">
        {{ t('games.promo.suspiciousText') }}
        <a @click="openWhyConnectModal" class="why-connect-link">{{ t('games.promo.whyConnectLinkText') }}</a>
      </p>

      <div class="action-area">
        <CustomButton
          type="is-primary"
          :label="t('games.loginButton')"
          :icon="['fab', 'x-twitter']"
          :loading="loading"
          @click="handleLogin"
        />
      </div>
      <p class="promo-privacy">
        {{ privacy || t('games.promo.privacy') }}
      </p>

      
    </div>
  </div>

  <!-- Why Connect Modal -->
  <Teleport to="body">
    <div v-if="showWhyConnectModal" class="why-connect-modal-overlay" @click="closeWhyConnectModal">
      <div class="why-connect-modal" @click.stop>
        <button class="why-connect-modal-close" @click="closeWhyConnectModal" :aria-label="t('common.close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>
        <div class="why-connect-modal-header">
          <h3 class="why-connect-modal-title">
            <font-awesome-icon :icon="['fas', 'circle-info']" />
            {{ t('why-connect.hero.title') }}
          </h3>
        </div>
        <div class="why-connect-modal-content">
          <div class="why-connect-modal-text" v-html="whyConnectContent"></div>
          <div class="why-connect-modal-action">
            <CustomButton
              type="is-primary"
              :label="t('games.loginButton')"
              :icon="['fab', 'x-twitter']"
              :loading="loading"
              @click="handleLogin"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const props = defineProps<{
  mode?: 'inline' | 'fixed' | 'overlay';
  title?: string;
  subtitle?: string;
  privacy?: string;
  gameId?: string;
  context?: string;
  isVisible?: boolean; // For fixed/overlay modes to control transition
}>();

const emit = defineEmits(['login-success', 'close']);

const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const loading = ref(false);
const showWhyConnectModal = ref(false);

const whyConnectContent = computed(() => {
  if (localeStore.language === 'il') {
    return `
      <p><strong>למה כדאי להתחבר?</strong><br>
      כי בלי חיבור - זה סתם קשקוש.<br>
      רק עם חיבור - זו חוויה אמיתית.</p>

      <p>כדי לשמור על משחק הוגן, למנוע הצבעות כפולות, ולאפשר דירוגים אמיתיים -<br>
      אנחנו צריכים לדעת שאתה אתה, ולא בוט או מישהו שמנסה להטות תוצאות.</p>

      <p><strong>רגע, אתה מהחשדנים?</strong><br>
      פרנואיד? חשדן? אלרגי ל-״התחבר עם X״?<br>
      מבינים אותך לגמרי. גם אנחנו כאלה.</p>

      <p><strong>אז הנה כל האמת, בלי אותיות קטנות:</strong></p>

      <p>🔍 אנחנו לוקחים רק מידע פומבי: כמו שם משתמש, שם ותמונת פרופיל.<br>
      המקסימום שיכולים להרחיק לכת להציג זה את כמות העוקבים-נעקבים ואת הביו שלך.</p>

      <p>🚫 אין לנו הרשאה לפרסם בשמך.</p>

      <p>🤐 אנחנו לא יכולים לקרוא הודעות, לא נוגעים בפיד ולא עושים קונצים מאחורי הגב.</p>

      <p>🙄 וגם אם היינו יכולים - לא היינו עושים את זה. באמת.</p>

      <p><strong>החיבור נועד לדבר אחד בלבד:</strong><br>
      לוודא שהמשחק הוגן, אישי, ושאתה זה אתה.<br>
      ולאפשר חוויה מלאה של שמירת דברים שעשית, הוספת חברים, הופעה ב-Top Charts וכד׳.</p>

      <p><strong>אז מה יוצא לי מזה?</strong><br>
      חיבור ל-X פותח פיצ׳רים מתקדמים:</p>

      <ul>
        <li>✅ ההצבעות שלך נספרות לתוצאות (אין הצבעות כפולות).</li>
        <li>✏️ שמירת אתגרים לצורך עריכה והמשך משחק.</li>
        <li>🏆 הופעה בטופ־צ׳ארטס.</li>
        <li>🤼‍♂️ השוואת הישגים עם חברים, ואויבים…</li>
        <li>👀 מעקב אחרי משתמשים אחרים.</li>
        <li>📊 גישה לתוצאות וסטטיסטיקות.</li>
        <li>🧠 יצירה ושמירה של אתגרים חדשים.</li>
        <li>👤 דף פרופיל עם אפשרויות מתקדמות.</li>
        <li>🎖️ באדג׳ים ותיעוד שימוש באתגרים שאתה יצרת.</li>
      </ul>

      <p><strong>בקיצור:</strong><br>
      בלי חיבור אתה צופה. טרול. חשוד כבוט איראני.<br>
      עם חיבור אתה בנאדם. אתה שחקן. אתה נשמה.</p>
    `;
  } else {
    return `
      <p><strong>Why should I connect?</strong><br>
      Because without connection - it's just nonsense.<br>
      Only with connection - it's a real experience.</p>

      <p>To maintain fair play, prevent duplicate votes, and enable real ratings -<br>
      We need to know you're you, not a bot or someone trying to skew results.</p>

      <p><strong>Are you one of the suspicious ones?</strong><br>
      Paranoid? Suspicious? Allergic to 'Connect with X'?<br>
      We totally understand. We are too.</p>

      <p><strong>So here's the whole truth, no small print:</strong></p>

      <p>🔍 We only take public info: like username, name and profile picture.<br>
      The most we could go is to display follower-following count and bio.</p>

      <p>🚫 We have no permission to post on your behalf.</p>

      <p>🤐 We cannot read messages, we don't touch the feed and we don't do shenanigans behind your back.</p>

      <p>🙄 And even if we could - we wouldn't do it. Seriously.</p>

      <p><strong>The connection is meant for one thing only:</strong><br>
      To ensure fair play, personal, and that you're you.<br>
      And to allow full experience of saving things you've done, adding friends, appearing in Top Charts etc.</p>

      <p><strong>So what do I get from this?</strong><br>
      Connecting to X opens advanced features:</p>

      <ul>
        <li>✅ Your votes count towards results (no duplicate votes).</li>
        <li>✏️ Save challenges for editing and continued play.</li>
        <li>🏆 Appear in Top-Charts.</li>
        <li>🤼‍♂️ Compare achievements with friends, and enemies…</li>
        <li>👀 Track other users.</li>
        <li>📊 Access to results and statistics.</li>
        <li>🧠 Create and save new challenges.</li>
        <li>👤 Profile page with advanced options.</li>
        <li>🎖️ Badges and documentation of challenges you've created.</li>
      </ul>

      <p><strong>In short:</strong><br>
      Without connection you're watching. Troll. Suspected as Iranian bot.<br>
      With connection you're a human. You're a player. You're a soul.</p>
    `;
  }
});

function openWhyConnectModal() {
  showWhyConnectModal.value = true;
}

function closeWhyConnectModal() {
  showWhyConnectModal.value = false;
}

async function handleLogin() {
  loading.value = true;
  try {
    await userStore.loginWithX();
    if (analytics) {
      logEvent(analytics, 'user_action', { 
        action: 'login', 
        method: 'x_auth', 
        context: props.context || 'game_promo', 
        game_id: props.gameId 
      });
    }
    emit('login-success');
  } catch (error) {
    console.error('Login failed:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.game-login-promo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(31, 31, 31, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%);
  border: 1px solid rgba(0, 232, 224, 0.3);
  box-shadow: 0 8px 32px rgba(0, 232, 224, 0.15);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  width: 100%;
}

/* Add a subtle glow/shine effect */
.game-login-promo::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 232, 224, 0.05) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  max-width: 500px;
}

.promo-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
  background: linear-gradient(90deg, #fff, #00e8e0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.promo-subtitle {
  font-size: 1rem;
  color: #ccc;
  line-height: 1.5;
  margin: 0;
  max-width: 90%;
}

.promo-privacy {
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.5rem;
  max-width: 90%;
}

.promo-link {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  text-align: center;
}

.why-connect-link {
  color: #00e8e0;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}

.why-connect-link:hover {
  color: #00b8b0;
}

.action-area {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* === MODES === */

/* INLINE MODE (Default card) */
.game-login-promo.inline {
  margin: 2rem auto;
  max-width: 600px;
  transform: translateY(0);
}

/* FIXED MODE (Bottom Sheet / Sticky Footer) */
.game-login-promo.fixed {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 100%); /* Start hidden */
  border-radius: 24px 24px 0 0;
  border-bottom: none;
  z-index: 1000;
  width: 100%;
  max-width: 500px; /* Constrain on desktop */
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
  padding-bottom: env(safe-area-inset-bottom, 2rem); /* Handle iPhone notches */
}

/* Slide up animation for fixed mode */
.game-login-promo.fixed.is-visible {
  transform: translate(-50%, 0);
}

/* OVERLAY MODE (Centered Modal-ish) */
.game-login-promo.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

/* === RESPONSIVE === */
@media screen and (max-width: 767px) {
  .game-login-promo {
    padding: 1.5rem;
  }
  
  .game-login-promo.inline {
    border-radius: 12px;
    margin: 1rem 0;
    width: 100%;
  }

  .game-login-promo.fixed {
    max-width: 100%; /* Full width on mobile */
    border-radius: 20px 20px 0 0;
    border-left: none;
    border-right: none;
  }

  .promo-title {
    font-size: 1.3rem;
  }
  
  .promo-subtitle {
    font-size: 0.9rem;
  }
}

/* Extra small mobile devices (< 400px) */
@media screen and (max-width: 399px) {
  .promo-title {
    font-size: 1.1rem;
  }

  .promo-subtitle {
    font-size: 0.8rem;
  }

  .promo-privacy,
  .promo-link {
    font-size: 0.75rem;
  }
}

/* Why Connect Modal Styles */
.why-connect-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.why-connect-modal {
  background: linear-gradient(135deg, rgba(31, 31, 31, 0.98) 0%, rgba(18, 18, 18, 0.98) 100%);
  border: 1px solid rgba(0, 232, 224, 0.3);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  max-width: 600px;
  max-height: 80vh;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.why-connect-modal-close {
  position: absolute;
  top: 16px;
  inset-inline-end: 16px;
  background: none;
  border: none;
  color: #ccc;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 1;
}

.why-connect-modal-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.why-connect-modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.why-connect-modal-title {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.why-connect-modal-title .fa-circle-info {
  color: #00e8e0;
  font-size: 1.2em;
}

.why-connect-modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.why-connect-modal-text {
  color: #ccc;
  line-height: 1.6;
  font-size: 0.95rem;
}

.why-connect-modal-text p {
  margin-bottom: 1rem;
}

.why-connect-modal-text ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.why-connect-modal-text li {
  margin-bottom: 0.5rem;
}

.why-connect-modal-text strong {
  color: #fff;
  font-weight: 600;
}

.why-connect-modal-action {
  padding: 0 24px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 16px;
}

/* Mobile styles */
@media screen and (max-width: 767px) {
  .why-connect-modal {
    width: 95%;
    max-height: 90vh;
  }

  .why-connect-modal-header {
    padding: 20px 20px 12px;
  }

  .why-connect-modal-title {
    font-size: 1.3rem;
  }

  .why-connect-modal-content {
    padding: 20px;
  }

  .why-connect-modal-action {
    padding: 0 20px 20px;
  }
}

/* RTL Support */
[dir="rtl"] .why-connect-modal-text {
  text-align: right;
  direction: rtl;
}

[dir="rtl"] .why-connect-modal-text ul {
  padding-right: 1.5rem;
  padding-left: 0;
}

[dir="rtl"] .why-connect-modal-title {
  direction: rtl;
}
</style>

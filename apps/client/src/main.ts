// src/main.ts
import { createApp } from 'vue';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { library } from '@fortawesome/fontawesome-svg-core';
import {faShare, faSave, faUserPlus, faRedo, faPlay, faSearch, faTable, faMedal, faSortUp, faSortDown, faCircleInfo, faDownload, faEdit, faSquarePollVertical, faCheckCircle, faTimesCircle, faQuestionCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import {  faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(faXTwitter,faShare, faSave, faUserPlus, faRedo, faPlay, faSearch, faTable, faMedal, faSortUp, faSortDown, faCircleInfo, faDownload, faEdit, faSquarePollVertical, faCheckCircle, faTimesCircle, faQuestionCircle, faClock);

import 'bulma/css/bulma.min.css';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/dark-theme.css';
import './styles/responsive-utils.css';

// Import Firebase from shared package (initializes once)
import { analytics, auth } from '@top-x/shared';

import { logEvent } from 'firebase/analytics';
import { useLocaleStore } from './stores/locale';
import { loadAdSenseScript } from './utils/googleAdsense';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
const head = createHead();

const app = createApp(App);
app
  .use(router)
  .use(pinia)
  .use(head)
  .component('font-awesome-icon', FontAwesomeIcon);

const localeStore = useLocaleStore(pinia);

loadAdSenseScript(import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID);

router.isReady().then(() => {
  localeStore.initialize().finally(() => {
    app.mount('#app');

    // PRERENDER SIGNAL
    if (import.meta.env.PROD && (window as any).__PRERENDER_INJECTED) {
      setTimeout(() => {
        document.dispatchEvent(new Event('prerender-ready'));
      }, 1200);
    }

    // Click analytics
    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const name = target.getAttribute('data-analytics-name') || target.tagName;
      logEvent(analytics, 'click', {
        element: name,
        page_path: window.location.pathname,
      });
    });
  });
});
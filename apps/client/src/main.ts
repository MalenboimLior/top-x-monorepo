// Entry point for the client application
import { createApp } from 'vue';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faShare,faSave, faUserPlus, faRedo, faPlay, faSearch, faTable,faMedal, faSortUp, faSortDown, faCircleInfo, faDownload,faEdit,faSquarePollVertical} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
// Add icons to library
library.add(faXTwitter,faShare, faSave, faUserPlus, faRedo, faPlay, faSearch, faTable,faMedal, faSortUp, faSortDown,faCircleInfo,faDownload,faEdit,faSquarePollVertical);

import 'bulma/css/bulma.min.css';
import './styles/dark-theme.css'; // Import custom dark theme overrides

import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
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

localeStore.initialize().finally(() => {
  app.mount('#app');

  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const name = target.getAttribute('data-analytics-name') || target.tagName;
    logEvent(analytics, 'click', {
      element: name,
      page_path: window.location.pathname,
    });
  });
});

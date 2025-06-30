// Entry point for the client application
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faSave, faUserPlus, faRedo, faPlay, faSearch, faTable,faMedal, faSortUp, faSortDown, faCircleInfo, faDownload} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// Add icons to library
library.add(faXTwitter, faSave, faUserPlus, faRedo, faPlay, faSearch, faTable,faMedal, faSortUp, faSortDown,faCircleInfo,faDownload);

import 'bulma/css/bulma.min.css';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';


const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

createApp(App)
  .use(router)
  .use(pinia)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app');

window.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const name = target.getAttribute('data-analytics-name') || target.tagName;
  logEvent(analytics, 'click', {
    element: name,
    page_path: window.location.pathname,
  });
});

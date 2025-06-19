// Entry point for the client application
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faSave, faUserPlus, faRedo, faPlay, faSearch, faTable } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// Add icons to library
library.add(faXTwitter, faSave, faUserPlus, faRedo, faPlay, faSearch, faTable);

import 'bulma/css/bulma.min.css';


const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

createApp(App)
  .use(router)
  .use(pinia)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app');
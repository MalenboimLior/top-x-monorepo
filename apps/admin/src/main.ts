// Entry point for the admin application
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';
import {
  faAngleDown,
  faBullhorn,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faChessQueen,
  faCog,
  faGamepad,
  faLayerGroup,
  faPenNib,
  faPlus,
  faSearch,
  faSignOutAlt,
  faSync,
  faTable,
  faThLarge,
} from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

library.add(
  faAngleDown,
  faBullhorn,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faChessQueen,
  faCog,
  faGamepad,
  faLayerGroup,
  faPenNib,
  faPlus,
  faSearch,
  faSignOutAlt,
  faSync,
  faTable,
  faThLarge,
  faXTwitter,
);

createApp(App)
  .use(router)
  .use(pinia)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app');
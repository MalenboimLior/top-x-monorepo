// Vue Router setup for the client site
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Profile from '@/views/Profile.vue';
import About from '@/views/About.vue';
import FAQ from '@/views/FAQ.vue';
import Trivia from '@/views/games/Trivia.vue';
import PyramidTier from '@/views/games/PyramidTier.vue';
import PyramidResultLoggedIn from '@/components/PyramidResultLoggedIn.vue';
import PyramidResultLoggedOut from '@/components/PyramidResultLoggedOut.vue';
// import TierTable from '@/views/games/TierTable.vue';

import FrenemySearch from '@/views/FrenemySearch.vue';

import { useUserStore } from '../stores/user';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const routes = [
  { path: '/', name: 'Home', component: Home },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true },
  },
  { path: '/about', name: 'About', component: About },
  { path: '/faq', name: 'FAQ', component: FAQ },
  { path: '/frenemies', name: 'FrenemySearch', component: FrenemySearch },
  { path: '/games/trivia', name: 'Trivia', component: Trivia },
  {
    path: '/games/PyramidTier',
    name: 'PyramidTier',
    component: PyramidTier,
  },
  {
    path: '/games/PyramidTier/result/logged-in',
    name: 'PyramidResultLoggedIn',
    component: PyramidResultLoggedIn,
  },
  {
    path: '/games/PyramidTier/result/logged-out',
    name: 'PyramidResultLoggedOut',
    component: PyramidResultLoggedOut,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = !!userStore.user;

  console.log('Router guard - isAuthenticated:', isAuthenticated, 'Route:', to.path); // Debug log

  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Redirecting to / due to unauthenticated access to', to.path);
    next('/');
  } else {
    next();
  }
});

router.afterEach((to) => {
  logEvent(analytics, 'page_view', {
    page_path: to.fullPath,
    page_title: String(to.name || to.fullPath),
  });
});

export default router;
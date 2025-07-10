import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import ComingSoon from '@/views/ComingSoon.vue';
import Profile from '@/views/Profile.vue';
import About from '@/views/About.vue';
import FAQ from '@/views/FAQ.vue';
import Trivia from '@/views/games/Trivia.vue';
import PyramidTier from '@/views/games/PyramidTier.vue';
import FrenemySearch from '@/views/FrenemySearch.vue';
import { useUserStore } from '../stores/user';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const routes = [
  {
    path: '/',
    name: 'ComingSoon',
    component: ComingSoon,
    beforeEnter: (to: import('vue-router').RouteLocationNormalized, from: import('vue-router').RouteLocationNormalized, next: import('vue-router').NavigationGuardNext) => {
      const params = new URLSearchParams(to.query as Record<string, string>);
      const game = params.get('game');
      const allowedGames = ['us_presidents_game', 'secret']; // Add other game IDs as needed
      if (game && allowedGames.includes(game)) {
        console.log('Router: Bypassing ComingSoon for game:', game);
        next(`/games/PyramidTier?game=${game}`);
      } else {
        console.log('Router: Showing ComingSoon page');
        next();
      }
    },
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
  },
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
    path: '/PrezPyramid',
    redirect: {
      path: '/games/PyramidTier',
      query: { game: 'us_presidents_game' },
    },
  },
  {
    path: '/IsraelSoccerPyramid',
    redirect: {
      path: '/games/PyramidTier',
      query: { game: 'Pyramid_soccer_israel' },
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = !!userStore.user;

  console.log('Router guard - isAuthenticated:', isAuthenticated, 'Route:', to.path);

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
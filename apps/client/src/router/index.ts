
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Profile from '@/views/Profile.vue';
import About from '@/views/About.vue';
import TermsOfUse from '@/views/TermsOfUse.vue';
import PrivacyPolicy from '@/views/PrivacyPolicy.vue';
import ContactUs from '@/views/ContactUs.vue';
import FAQ from '@/views/FAQ.vue';
import Trivia from '@/views/games/Trivia.vue';
import PyramidTier from '@/views/games/PyramidTier.vue';
import FrenemySearch from '@/views/FrenemySearch.vue';
import { useUserStore } from '../stores/user';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import ZoneReveal from '../views/games/ZoneReveal.vue';

const routes = [
  // {
  //   path: '/',
  //   name: 'ComingSoon',
  //   component: ComingSoon,
  //   beforeEnter: (to: import('vue-router').RouteLocationNormalized, from: import('vue-router').RouteLocationNormalized, next: import('vue-router').NavigationGuardNext) => {
  //     const params = new URLSearchParams(to.query as Record<string, string>);
  //     const game = params.get('game');
  //     const allowedGames = ['us_presidents_game', 'secret']; // Add other game IDs as needed
  //     if (game && allowedGames.includes(game)) {
  //       console.log('Router: Bypassing ComingSoon for game:', game);
  //       next(`/games/PyramidTier?game=${game}`);
  //     } else {
  //       console.log('Router: Showing ComingSoon page');
  //       next();
  //     }
  //   },
  // },
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
  },
  { path: '/about', name: 'About', component: About },
  { path: '/terms', name: 'TermsOfUse', component: TermsOfUse },
  { path: '/privacy', name: 'PrivacyPolicy', component: PrivacyPolicy },
  { path: '/contact', name: 'ContactUs', component: ContactUs },
  { path: '/faq', name: 'FAQ', component: FAQ },

  { path: '/frenemies', name: 'FrenemySearch', component: FrenemySearch },
  { path: '/games/trivia', name: 'Trivia', component: Trivia },
  {
    path: '/games/ZoneReveal',
    name: 'ZoneReveal',
    component: ZoneReveal,
  },
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
    path: '/FootballStarsIL',
    redirect: {
      path: '/games/PyramidTier',
      query: { game: 'FootballStarsIL' },
    },
  },

];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 };
  },
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

router.afterEach((to, from) => {
  if (analytics) {
    const userStore = useUserStore();
    const game = to.query.game || 'unknown';
    logEvent(analytics, 'navigation', {
      from_path: from.fullPath,
      to_path: to.fullPath,
      logged_in: !!userStore.user,
      game_id: game,
    });
    logEvent(analytics, 'page_view_public', {
      page_path: to.path,
      page_search: to.fullPath.split('?')[1] || '',
      page_title: document.title || to.name,
      game_id: game,
    });
  }
});
export default router;

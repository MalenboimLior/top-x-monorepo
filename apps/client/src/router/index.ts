import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/user';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
const Home = () => import('@/views/Home.vue');
const Profile = () => import('@/views/Profile.vue');
const About = () => import('@/views/About.vue');
const TermsOfUse = () => import('@/views/TermsOfUse.vue');
const PrivacyPolicy = () => import('@/views/PrivacyPolicy.vue');
const ContactUs = () => import('@/views/ContactUs.vue');
const FAQ = () => import('@/views/FAQ.vue');
const Trivia = () => import('@/views/games/Trivia.vue');
const PyramidTier = () => import('@/views/games/PyramidTier.vue');
const FrenemySearch = () => import('@/views/FrenemySearch.vue');
const ZoneReveal = () => import('@/views/games/ZoneReveal.vue');
const Build = () => import('@/views/Build.vue');
const DailyChallenges = () => import('@/views/DailyChallenges.vue');
const GameInfo = () => import('@/views/GameInfo.vue');
import FisherGame from '@/views/games/FisherGame.vue';

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
    component: () => import(/* webpackChunkName: "home" */ '@/views/Home.vue'),
  },
  {
  path: '/games/FisherGame',
  name: 'FisherGame',
  component: FisherGame,
},
  {
    path: '/games/info',
    name: 'GameInfo',
    component: () => import(/* webpackChunkName: "game-info" */ '@/views/GameInfo.vue'),
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import(/* webpackChunkName: "profile" */ '@/views/Profile.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import(/* webpackChunkName: "about" */ '@/views/About.vue'),
  },
  {
    path: '/terms',
    name: 'TermsOfUse',
    component: () => import(/* webpackChunkName: "terms" */ '@/views/TermsOfUse.vue'),
  },
  {
    path: '/privacy',
    name: 'PrivacyPolicy',
    component: () => import(/* webpackChunkName: "privacy" */ '@/views/PrivacyPolicy.vue'),
  },
  {
    path: '/contact',
    name: 'ContactUs',
    component: () => import(/* webpackChunkName: "contact" */ '@/views/ContactUs.vue'),
  },
  {
    path: '/faq',
    name: 'FAQ',
    component: () => import(/* webpackChunkName: "faq" */ '@/views/FAQ.vue'),
  },
  {
    path: '/DailyChallenges',
    name: 'DailyChallenges',
    component: () => import(/* webpackChunkName: "daily-challenges" */ '@/views/DailyChallenges.vue'),
  },

  {
    path: '/frenemies',
    name: 'FrenemySearch',
    component: () =>
      import(/* webpackChunkName: "frenemy-search" */ '@/views/FrenemySearch.vue'),
  },
  {
    path: '/games/trivia',
    name: 'Trivia',
    component: () =>
      import(/* webpackChunkName: "trivia" */ '@/views/games/Trivia.vue'),
  },
  {
    path: '/games/ZoneReveal',
    name: 'ZoneReveal',
    component: () =>
      import(/* webpackChunkName: "zone-reveal" */ '@/views/games/ZoneReveal.vue'),
  },
  {
    path: '/games/Pacman',
    name: 'Pacman',
    component: () =>
      import(/* webpackChunkName: "pacman" */ '@/views/games/Pacman.vue'),
  },
  {
    path: '/games/PyramidTier',
    name: 'PyramidTier',
    component: () =>
      import(/* webpackChunkName: "pyramid-tier" */ '@/views/games/PyramidTier.vue'),
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
  {
    path: '/build',
    name: 'Build',
    component: () => import(/* webpackChunkName: "build" */ '@/views/Build.vue'),
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
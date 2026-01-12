import { createRouter, createWebHistory } from 'vue-router';
import { nextTick } from 'vue';
import { useUserStore } from '../stores/user';
import { useThemeStore } from '../stores/theme';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
const Home = () => import('@/views/Home.vue');
const Profile = () => import('@/views/Profile.vue');
const About = () => import('@/views/About.vue');
const TermsOfUse = () => import('@/views/TermsOfUse.vue');
const PrivacyPolicy = () => import('@/views/PrivacyPolicy.vue');
const Cookies = () => import('@/views/Cookies.vue');
const DMCA = () => import('@/views/DMCA.vue');
const ManagePrivacySettings = () => import('@/views/ManagePrivacySettings.vue');
const ContactUs = () => import('@/views/ContactUs.vue');
const FAQ = () => import('@/views/FAQ.vue');
const Guidelines = () => import('@/views/Guidelines.vue');
const HowItWorks = () => import('@/views/HowItWorks.vue');
const WhyConnect = () => import('@/views/WhyConnect.vue');
const Trivia = () => import('@/views/games/Trivia.vue');
const PyramidTier = () => import('@/views/games/PyramidTier.vue');
const Users = () =>
  import(/* webpackChunkName: "users" */ '@/views/FrenemySearch.vue');
const ZoneReveal = () => import('@/views/games/ZoneReveal.vue');
const Build = () => import('@/views/Build.vue');
const GameInfo = () => import('@/views/GameInfo.vue');
import FisherGame from '@/views/games/FisherGame.vue';

const routes = [

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
    path: '/games/SampleGame',
    name: 'SampleGame',
    component: () =>
      import(/* webpackChunkName: "sample-game" */ '@/views/games/SampleGame.vue'),
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
    path: '/cookies',
    name: 'Cookies',
    component: () => import(/* webpackChunkName: "cookies" */ '@/views/Cookies.vue'),
  },
  {
    path: '/DMCA',
    name: 'DMCA',
    component: () => import(/* webpackChunkName: "dmca" */ '@/views/DMCA.vue'),
  },
  {
    path: '/MPS',
    name: 'ManagePrivacySettings',
    component: () => import(/* webpackChunkName: "mps" */ '@/views/ManagePrivacySettings.vue'),
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
    path: '/guidelines',
    name: 'Guidelines',
    component: () => import(/* webpackChunkName: "guidelines" */ '@/views/Guidelines.vue'),
  },
  {
    path: '/how-it-works',
    name: 'HowItWorks',
    component: () => import(/* webpackChunkName: "how-it-works" */ '@/views/HowItWorks.vue'),
  },
  {
    path: '/why-connect',
    name: 'WhyConnect',
    component: () => import(/* webpackChunkName: "why-connect" */ '@/views/WhyConnect.vue'),
  },

  {
    path: '/users',
    name: 'Users',
    component: Users,
  },
  {
    path: '/games',
    name: 'Games',
    component: () => import(/* webpackChunkName: "games" */ '@/views/Games.vue'),
  },
  {
    path: '/games/trivia',
    name: 'Trivia',
    component: () =>
      import(/* webpackChunkName: "trivia" */ '@/views/games/Trivia.vue'),
  },
  {
    path: '/games/quiz',
    name: 'Quiz',
    component: () =>
      import(/* webpackChunkName: "quiz" */ '@/views/games/Quiz.vue'),
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
    path: '/FoodPyramidIL',
    redirect: {
      path: '/games/PyramidTier',
      query: { game: 'FoodPyramidIL' },
    },
  },
  {
    path: '/XUsers2025',
    redirect: {
      path: '/games/PyramidTier',
      query: { game: 'xusers2025' },
    },
  },
  {
    path: '/build',
    name: 'Build',
    component: () => import(/* webpackChunkName: "build" */ '@/views/Build.vue'),
  },
  {
    path: '/build/new/:gameType',
    name: 'BuildCreate',
    component: () => import(/* webpackChunkName: "build-create" */ '@/views/BuildCreate.vue'),
  },
  {
    path: '/build/edit/:gameId',
    name: 'BuildEdit',
    component: () => import(/* webpackChunkName: "build-edit" */ '@/views/BuildEdit.vue'),
  },
  {
    path: '/meme-generator',
    name: 'MemeGenerator',
    component: () => import(/* webpackChunkName: "meme-generator" */ '@/views/MemeGenerator.vue'),
  },
  {
    path: '/tools/tap-to-transform',
    name: 'TapToTransform',
    component: () => import(/* webpackChunkName: "tap-to-transform" */ '@/views/TapToTransform.vue'),
  },
  {
    path: '/tools/books',
    name: 'BookListBuilder',
    component: () => import(/* webpackChunkName: "book-list-builder" */ '@/views/BookListBuilder.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import(/* webpackChunkName: "not-found" */ '@/views/NotFound.vue'),
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

// Helper function to check if a route is a game route
function isGameRoute(path: string): boolean {
  return path.startsWith('/games/') && path !== '/games/info';
}

router.afterEach((to, from) => {
  // Handle theme switching for game routes
  const themeStore = useThemeStore();
  const toIsGame = isGameRoute(to.path);
  const fromIsGame = isGameRoute(from.path);

  if (toIsGame && !fromIsGame) {
    // Entering a game route - force dark mode
    themeStore.forceDarkModeForGame();
  } else if (!toIsGame && fromIsGame) {
    // Leaving a game route - restore user preference
    themeStore.restoreUserPreference();
  }
  // If navigating between game routes, stay in dark mode (no action needed)

  // Force scroll to top on route change
  // Use nextTick to ensure DOM is updated before scrolling
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

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
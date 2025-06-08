import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Profile from '@/views/Profile.vue';
import About from '@/views/About.vue';
import FAQ from '@/views/FAQ.vue';
import Trivia from '@/views/games/Trivia.vue';
// import TierTable from '@/views/games/TierTable.vue';

import RivalSearch from '@/views/RivalSearch.vue';

import { useUserStore } from '@/stores/user';

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
  { path: '/rivals', name: 'RivalSearch', component: RivalSearch },
  { path: '/games/trivia', name: 'Trivia', component: Trivia },
  // {path: '/games/tier-table', name: 'TierTable', component: TierTable},
{
  path: '/tier-table',
  name: 'TierTable',
  component: () => import('@/components/TierTable.vue')
}
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

export default router;
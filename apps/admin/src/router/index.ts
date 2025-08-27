import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/user';
import Home from '@/views/Home.vue';
import Login from '@/views/Login.vue';
import GameManagement from '@/views/GameManagement.vue';
import SendMessage from '@/views/SendMessage.vue';  // New import

const routes = [
  { path: '/', name: 'Dashboard', component: Home, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/game-management', name: 'GameManagement', component: GameManagement, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/send-message', name: 'SendMessage', component: SendMessage, meta: { requiresAuth: false, requiresAdmin: false } },  // New route
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  console.log('Router guard: Navigating to', to.path, 'user:', {
    uid: userStore.user?.uid,
    isAdmin: userStore.user?.isAdmin,
  });

  if (to.meta.requiresAuth && !userStore.user) {
    console.log('Redirecting to /login: User not authenticated');
    next('/login');
  } else if (to.meta.requiresAdmin && !userStore.user?.isAdmin) {
    console.log('Redirecting to /login: User is not admin');
    next('/login');
  } else {
    console.log('Navigation allowed');
    next();
  }
});

export default router;
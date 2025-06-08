import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '@top-x/shared';
import Dashboard from '@/views/Dashboard.vue';
import Login from '@/views/Login.vue';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const user = auth.currentUser;
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);

  if (requiresAdmin && !user) {
    next('/login');
  } else if (requiresAdmin && user) {
    const userDoc = await import('@top-x/shared').then((m) => m.db).collection('users').doc(user.uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;
    isAdmin ? next() : next('/login');
  } else {
    next();
  }
});

export default router;
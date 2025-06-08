import { createRouter, createWebHistory } from 'vue-router';
import { auth, db } from '@top-x/shared';
import { doc, getDoc } from 'firebase/firestore';
import Home from '@/views/Home.vue';
import GameManagement from '@/views/GameManagement.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/game-management',
    name: 'GameManagement',
    component: GameManagement,
    meta: { requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  if (requiresAdmin) {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().isAdmin) {
        next();
      } else {
        next('/');
      }
    } else {
      next('/');
    }
  } else {
    next();
  }
});

export default router;
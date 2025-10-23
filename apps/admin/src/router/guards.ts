import type { Router } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';

export function registerAuthGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore();
    const { user } = storeToRefs(userStore);

    if (to.meta.requiresAuth && !user.value) {
      next({ name: 'login', query: { redirect: to.fullPath } });
      return;
    }

    if (to.meta.requiresAdmin && !user.value?.isAdmin) {
      next({ name: 'login' });
      return;
    }

    next();
  });
}

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AdminShell from '@/layouts/AdminShell.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import GameTypesPage from '@/pages/GameTypesPage.vue';
import GamesPage from '@/pages/GamesPage.vue';
import TriviaRehashPage from '@/pages/TriviaRehashPage.vue';
import HomePageManager from '@/pages/HomePageManager.vue';
import CommunicationsPage from '@/pages/CommunicationsPage.vue';
import SettingsPage from '@/pages/SettingsPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import { registerAuthGuards } from '@/router/guards';
import UsersPage from '@/pages/UsersPage.vue';

const adminChildren: RouteRecordRaw[] = [
  { path: '', name: 'dashboard', component: DashboardPage, meta: { title: 'Dashboard', requiresAuth: true, requiresAdmin: true } },
  { path: 'game-types', name: 'game-types', component: GameTypesPage, meta: { title: 'Game Types', requiresAuth: true, requiresAdmin: true } },
  { path: 'games', name: 'games', component: GamesPage, meta: { title: 'Games', requiresAuth: true, requiresAdmin: true } },
  {
    path: 'games/trivia-rehash',
    name: 'trivia-rehash',
    component: TriviaRehashPage,
    meta: {
      title: 'Rehash Trivia',
      subtitle: 'Refresh answer hashes for a Trivia game after rotating secrets.',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  { path: 'users', name: 'users', component: UsersPage, meta: { title: 'Users', subtitle: 'Search and curate featured creators for the homepage.', requiresAuth: true, requiresAdmin: true } },
  { path: 'homepage', name: 'homepage', component: HomePageManager, meta: { title: 'Homepage', requiresAuth: true, requiresAdmin: true } },
  { path: 'communications', name: 'communications', component: CommunicationsPage, meta: { title: 'Communications', requiresAuth: true, requiresAdmin: true } },
  { path: 'settings', name: 'settings', component: SettingsPage, meta: { title: 'Settings', requiresAuth: true, requiresAdmin: true } },
];

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AdminShell,
    children: adminChildren,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { requiresAuth: false },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

registerAuthGuards(router);

export default router;

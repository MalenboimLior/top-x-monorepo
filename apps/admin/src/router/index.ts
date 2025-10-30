import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AdminShell from '@/layouts/AdminShell.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import GameTypesPage from '@/pages/GameTypesPage.vue';
import GamesPage from '@/pages/GamesPage.vue';
import HomePageManager from '@/pages/HomePageManager.vue';
import ContentPage from '@/pages/ContentPage.vue';
import CommunicationsPage from '@/pages/CommunicationsPage.vue';
import SettingsPage from '@/pages/SettingsPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import { registerAuthGuards } from '@/router/guards';

const adminChildren: RouteRecordRaw[] = [
  { path: '', name: 'dashboard', component: DashboardPage, meta: { title: 'Dashboard', requiresAuth: true, requiresAdmin: true } },
  { path: 'game-types', name: 'game-types', component: GameTypesPage, meta: { title: 'Game Types', requiresAuth: true, requiresAdmin: true } },
  { path: 'games', name: 'games', component: GamesPage, meta: { title: 'Games', requiresAuth: true, requiresAdmin: true } },
  { path: 'homepage', name: 'homepage', component: HomePageManager, meta: { title: 'Homepage', requiresAuth: true, requiresAdmin: true } },
  { path: 'content', name: 'content', component: ContentPage, meta: { title: 'Content', requiresAuth: true, requiresAdmin: true } },
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

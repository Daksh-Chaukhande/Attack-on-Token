import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import HomeView from '../views/HomeView.vue';
import HowItWorksView from '../views/HowItWorksView.vue';
import FoodSafetyView from '../views/FoodSafetyView.vue';
import BrowseListingsView from '../views/BrowseListingsView.vue';
import ListingDetailView from '../views/ListingDetailView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import DashboardView from '../views/DashboardView.vue';
import CreateListingView from '../views/CreateListingView.vue';
import MyListingsView from '../views/MyListingsView.vue';
import MyClaimsView from '../views/MyClaimsView.vue';
import ClaimDetailView from '../views/ClaimDetailView.vue';
import VerifyPickupView from '../views/VerifyPickupView.vue';
import NotificationsView from '../views/NotificationsView.vue';
import AdminView from '../views/AdminView.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/how-it-works', name: 'how-it-works', component: HowItWorksView },
  { path: '/food-safety', name: 'food-safety', component: FoodSafetyView },
  { path: '/listings', name: 'listings', component: BrowseListingsView },
  { path: '/listings/:id', name: 'listing-detail', component: ListingDetailView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/listings/create',
    name: 'create-listing',
    component: CreateListingView,
    meta: { requiresAuth: true, requiresDonor: true },
  },
  {
    path: '/my-listings',
    name: 'my-listings',
    component: MyListingsView,
    meta: { requiresAuth: true, requiresDonor: true },
  },
  {
    path: '/my-claims',
    name: 'my-claims',
    component: MyClaimsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/claims/:id',
    name: 'claim-detail',
    component: ClaimDetailView,
    meta: { requiresAuth: true },
  },
  {
    path: '/verify-pickup',
    name: 'verify-pickup',
    component: VerifyPickupView,
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: NotificationsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'dashboard' });
  }

  if (to.meta.requiresDonor && !authStore.isDonor) {
    return next({ name: 'dashboard' });
  }

  next();
});

export default router;

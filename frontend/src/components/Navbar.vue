<template>
  <header class="navbar">
    <div class="container nav-container">
      <router-link to="/" class="brand">
        <span class="brand-icon">🍲</span>
        <span class="brand-name">Share<span class="text-primary">Plate</span></span>
      </router-link>

      <nav class="nav-links">
        <router-link to="/listings" class="nav-link">Find Food</router-link>
        <router-link to="/how-it-works" class="nav-link">How It Works</router-link>
        <router-link to="/food-safety" class="nav-link">Food Safety</router-link>
        
        <template v-if="authStore.isAuthenticated">
          <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
          
          <router-link v-if="authStore.isDonor" to="/listings/create" class="nav-link nav-highlight">
            + Donate Food
          </router-link>
          <router-link v-if="authStore.isDonor" to="/my-listings" class="nav-link">
            My Listings
          </router-link>

          <router-link v-if="authStore.isClaimant" to="/my-claims" class="nav-link">
            My Claims
          </router-link>

          <router-link to="/verify-pickup" class="nav-link">
            Verify Pickup
          </router-link>

          <router-link v-if="authStore.isAdmin" to="/admin" class="nav-link admin-pill">
            Admin
          </router-link>
        </template>
      </nav>

      <div class="nav-actions">
        <template v-if="authStore.isAuthenticated">
          <router-link to="/notifications" class="icon-btn" title="Notifications">
            🔔
          </router-link>
          <div class="user-info">
            <span class="user-name">{{ authStore.user?.name }}</span>
            <span class="role-badge">{{ authStore.user?.role }}</span>
          </div>
          <button @click="handleLogout" class="btn btn-sm btn-outline">
            Logout
          </button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-outline btn-sm">Log In</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm">Join SharePlate</router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  background: #ffffff;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-main);
  text-decoration: none;
}

.brand-icon {
  font-size: 1.6rem;
}

.text-primary {
  color: var(--primary);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-link {
  font-size: 0.925rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}

.nav-link:hover, .nav-link.router-link-active {
  color: var(--primary);
}

.nav-highlight {
  color: var(--primary);
  background: var(--primary-light);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-md);
}

.admin-pill {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-md);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-btn {
  font-size: 1.15rem;
  text-decoration: none;
  cursor: pointer;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 700;
}

.role-badge {
  font-size: 0.7rem;
  color: var(--primary);
  font-weight: 600;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .nav-links {
    display: none;
  }
}
</style>

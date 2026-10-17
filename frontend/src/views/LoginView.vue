<template>
  <div class="container py-12">
    <div class="auth-card card">
      <div class="text-center mb-6">
        <span class="auth-icon">🔐</span>
        <h2>Sign in to SharePlate</h2>
        <p class="text-muted text-sm mt-1">Access your donations, reservations, and pickup QR codes</p>
      </div>

      <div v-if="errorMessage" class="alert-danger mb-4">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@organization.org"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="form-input"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary w-full mt-2">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="demo-section mt-8">
        <div class="demo-header">
          <span class="demo-title">⚡ Quick Demo Test Accounts</span>
          <span class="demo-subtitle">(Password: Password123!)</span>
        </div>
        <div class="demo-grid">
          <button @click="fillAndLogin('admin@shareplate.org')" class="demo-btn">
            👑 Admin
          </button>
          <button @click="fillAndLogin('greenbistro@shareplate.org')" class="demo-btn">
            👨‍🍳 Donor (Chef)
          </button>
          <button @click="fillAndLogin('artisanbakery@shareplate.org')" class="demo-btn">
            🥖 Donor (Bakery)
          </button>
          <button @click="fillAndLogin('volunteer1@shareplate.org')" class="demo-btn">
            🚲 Volunteer 1
          </button>
          <button @click="fillAndLogin('hopehouse@shareplate.org')" class="demo-btn">
            🏠 NGO Shelter
          </button>
          <button @click="fillAndLogin('citykitchen@shareplate.org')" class="demo-btn">
            🍲 Community
          </button>
        </div>
      </div>

      <div class="auth-footer mt-6 text-center text-sm">
        <span class="text-muted">Don't have an account? </span>
        <router-link to="/register" class="font-bold">Register here</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } catch (err: any) {
    errorMessage.value = err.message || 'Invalid email or password.';
  } finally {
    loading.value = false;
  }
}

async function fillAndLogin(userEmail: string) {
  email.value = userEmail;
  password.value = 'Password123!';
  await handleSubmit();
}
</script>

<style scoped>
.py-12 {
  padding: 4rem 1.25rem;
}

.auth-card {
  max-width: 460px;
  margin: 0 auto;
  padding: 2.25rem;
}

.auth-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.w-full {
  width: 100%;
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.demo-section {
  border-top: 1px dashed var(--border-color);
  padding-top: 1.5rem;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.demo-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
}

.demo-subtitle {
  font-size: 0.72rem;
  color: var(--text-light);
}

.demo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.demo-btn {
  background: #f9fafb;
  border: 1px solid var(--border-color);
  padding: 0.5rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  color: var(--text-main);
  text-align: left;
  transition: all 0.2s;
}

.demo-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary-dark);
}
</style>

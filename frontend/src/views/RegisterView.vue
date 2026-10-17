<template>
  <div class="container py-12">
    <div class="auth-card card">
      <div class="text-center mb-6">
        <span class="auth-icon">🤝</span>
        <h2>Join SharePlate</h2>
        <p class="text-muted text-sm mt-1">Create an account to donate surplus or coordinate food rescue</p>
      </div>

      <div v-if="errorMessage" class="alert-danger mb-4">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Sarah Jenkins"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="sarah@example.org"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            placeholder="At least 8 characters"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Account Role</label>
          <select v-model="form.role" class="form-select" required>
            <option value="VOLUNTEER">Individual Volunteer</option>
            <option value="DONOR">Food Donor (Restaurant / Bakery / Grocery)</option>
            <option value="NGO">NGO / Shelter / Food Bank</option>
            <option value="COMMUNITY_GROUP">Community Kitchen / Mutual Aid</option>
          </select>
        </div>

        <div class="form-group" v-if="form.role !== 'VOLUNTEER'">
          <label class="form-label">Organization Name</label>
          <input
            v-model="form.organizationName"
            type="text"
            required
            placeholder="Green Bistro Ltd / Hope Shelter"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Phone Number (Optional)</label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="+91 98765 43210"
            class="form-input"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary w-full mt-2">
          {{ loading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <div class="auth-footer mt-6 text-center text-sm">
        <span class="text-muted">Already registered? </span>
        <router-link to="/login" class="font-bold">Log in here</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'VOLUNTEER',
  phone: '',
  organizationName: '',
});

const loading = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      phone: form.phone || undefined,
      organizationName: form.organizationName || undefined,
    });
    router.push('/dashboard');
  } catch (err: any) {
    errorMessage.value = err.message || 'Registration failed. Please check your details.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.py-12 {
  padding: 4rem 1.25rem;
}

.auth-card {
  max-width: 480px;
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
</style>

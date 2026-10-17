import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'DONOR' | 'VOLUNTEER' | 'NGO' | 'COMMUNITY_GROUP' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  phone?: string;
  avatarUrl?: string;
  organizations?: Array<{
    id: string;
    name: string;
    type: string;
    verified: boolean;
    address?: string;
  }>;
  profile?: {
    bio?: string;
    city?: string;
    address?: string;
    notificationsEnabled?: boolean;
  };
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('shareplate_token'));
  const user = ref<User | null>(
    localStorage.getItem('shareplate_user')
      ? JSON.parse(localStorage.getItem('shareplate_user')!)
      : null
  );

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isDonor = computed(() => user.value?.role === 'DONOR' || isAdmin.value);
  const isClaimant = computed(
    () =>
      user.value?.role === 'VOLUNTEER' ||
      user.value?.role === 'NGO' ||
      user.value?.role === 'COMMUNITY_GROUP' ||
      isAdmin.value
  );

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data.token) {
      token.value = res.data.token;
      user.value = res.data.user;
      localStorage.setItem('shareplate_token', res.data.token);
      localStorage.setItem('shareplate_user', JSON.stringify(res.data.user));
    }
    return res;
  }

  async function register(payload: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
    organizationName?: string;
    organizationType?: string;
  }) {
    const res = await api.post('/auth/register', payload);
    if (res.success && res.data.token) {
      token.value = res.data.token;
      user.value = res.data.user;
      localStorage.setItem('shareplate_token', res.data.token);
      localStorage.setItem('shareplate_user', JSON.stringify(res.data.user));
    }
    return res;
  }

  async function fetchCurrentUser() {
    if (!token.value) return null;
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data.user) {
        user.value = res.data.user;
        localStorage.setItem('shareplate_user', JSON.stringify(res.data.user));
      }
      return user.value;
    } catch {
      logout();
      return null;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('shareplate_token');
    localStorage.removeItem('shareplate_user');
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isDonor,
    isClaimant,
    login,
    register,
    fetchCurrentUser,
    logout,
  };
});

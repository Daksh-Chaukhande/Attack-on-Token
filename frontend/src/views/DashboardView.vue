<template>
  <div class="container py-8">
    <div class="dashboard-header card mb-8">
      <div class="user-greeting">
        <span class="role-pill">{{ authStore.user?.role }}</span>
        <h1>Welcome, {{ authStore.user?.name }}</h1>
        <p class="text-muted">{{ authStore.user?.email }} • {{ organizationName }}</p>
      </div>

      <div class="quick-actions">
        <router-link v-if="authStore.isDonor" to="/listings/create" class="btn btn-primary">
          + Post New Surplus Food
        </router-link>
        <router-link to="/listings" class="btn btn-secondary">
          🍲 Browse Food
        </router-link>
        <router-link to="/verify-pickup" class="btn btn-outline">
          📷 Verify Pickup QR
        </router-link>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div class="metrics-grid mb-8">
      <div class="metric-card card">
        <span class="m-icon">📦</span>
        <div class="m-info">
          <span class="m-title">Active Listings</span>
          <span class="m-val">{{ stats.activeListings }}</span>
        </div>
      </div>
      <div class="metric-card card">
        <span class="m-icon">🤝</span>
        <div class="m-info">
          <span class="m-title">Claims in Progress</span>
          <span class="m-val">{{ stats.pendingClaims }}</span>
        </div>
      </div>
      <div class="metric-card card">
        <span class="m-icon">✅</span>
        <div class="m-info">
          <span class="m-title">Completed Redirections</span>
          <span class="m-val">{{ stats.completedClaims }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content Section: Donor Listings or Volunteer Claims -->
    <div class="card mb-8">
      <div class="section-title-row">
        <h3>{{ authStore.isDonor ? 'My Active Food Donations' : 'My Food Reservations' }}</h3>
        <router-link :to="authStore.isDonor ? '/my-listings' : '/my-claims'" class="text-sm font-bold">
          View full history →
        </router-link>
      </div>

      <div v-if="loading" class="p-6 text-center text-muted">
        Loading activity...
      </div>

      <div v-else-if="items.length === 0" class="p-6 text-center text-muted">
        <p>No recent activity. Start by donating or claiming available food!</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title / Item</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Pickup Deadline</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="font-bold">{{ item.title || item.listing?.title }}</td>
              <td>{{ item.quantity || item.remainingQuantity }} {{ item.quantityUnit || item.listing?.quantityUnit }}</td>
              <td>
                <span :class="['badge', `badge-${item.status.toLowerCase()}`]">
                  {{ item.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="text-sm">{{ formatDateTime(item.pickupDeadline || item.pickupEndTime) }}</td>
              <td>
                <router-link
                  :to="authStore.isDonor ? `/listings/${item.id}` : `/claims/${item.id}`"
                  class="btn btn-sm btn-outline"
                >
                  View Details
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(true);
const items = ref<any[]>([]);
const stats = ref({
  activeListings: 0,
  pendingClaims: 0,
  completedClaims: 0,
});

const organizationName = computed(() => {
  return authStore.user?.organizations?.[0]?.name || 'Community Member';
});

function formatDateTime(str?: string) {
  if (!str) return 'N/A';
  return new Date(str).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(async () => {
  try {
    if (authStore.isDonor) {
      const res = await api.get('/listings?limit=5');
      if (res.success && res.data.items) {
        items.value = res.data.items.filter((l: any) => l.donorId === authStore.user?.id);
        stats.value.activeListings = items.value.length;
      }
    } else {
      const res = await api.get('/claims/my');
      if (res.success && res.data.claims) {
        items.value = res.data.claims;
        stats.value.pendingClaims = items.value.filter((c: any) => c.status === 'PENDING_PICKUP').length;
        stats.value.completedClaims = items.value.filter((c: any) => c.status === 'COMPLETED').length;
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard data', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 2rem;
}

.role-pill {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
}

.m-icon {
  font-size: 2.25rem;
}

.m-info {
  display: flex;
  flex-direction: column;
}

.m-title {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.m-val {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-main);
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.data-table th {
  background: #f9fafb;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}
</style>

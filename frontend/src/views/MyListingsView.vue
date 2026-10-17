<template>
  <div class="container py-8">
    <div class="header-row mb-6">
      <div>
        <h1>My Surplus Food Listings</h1>
        <p class="text-muted">Manage your active, reserved, and completed food donations.</p>
      </div>
      <router-link to="/listings/create" class="btn btn-primary">
        + Post Surplus Food
      </router-link>
    </div>

    <div v-if="loading" class="card text-center p-8 text-muted">
      Loading your listings...
    </div>

    <div v-else-if="listings.length === 0" class="card empty-state text-center p-12">
      <h3>You haven't posted any food donations yet</h3>
      <p class="text-muted mt-1">Share surplus meals or bakery goods to reduce waste and help your neighborhood.</p>
      <router-link to="/listings/create" class="btn btn-primary mt-4">
        Create Your First Listing
      </router-link>
    </div>

    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Available / Total</th>
              <th>Status</th>
              <th>Pickup Window</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in listings" :key="item.id">
              <td class="font-bold">
                <router-link :to="`/listings/${item.id}`">{{ item.title }}</router-link>
              </td>
              <td>{{ item.category }}</td>
              <td>
                <span class="text-primary font-bold">{{ item.remainingQuantity }}</span>
                <span class="text-muted"> / {{ item.totalQuantity }} {{ item.quantityUnit }}</span>
              </td>
              <td>
                <span :class="['badge', `badge-${item.status.toLowerCase()}`]">
                  {{ item.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="text-sm">
                {{ formatDateTime(item.pickupStartTime) }} - {{ formatDateTime(item.pickupEndTime) }}
              </td>
              <td class="action-cell">
                <router-link :to="`/listings/${item.id}`" class="btn btn-sm btn-outline">
                  View
                </router-link>
                <button
                  v-if="['AVAILABLE', 'PARTIALLY_CLAIMED'].includes(item.status)"
                  @click="handleCancel(item.id)"
                  class="btn btn-sm btn-danger ml-2"
                >
                  Cancel
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const listings = ref<any[]>([]);
const loading = ref(true);

function formatDateTime(str?: string) {
  if (!str) return 'N/A';
  return new Date(str).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadListings() {
  loading.value = true;
  try {
    const res = await api.get('/listings?limit=100');
    if (res.success && res.data.items) {
      listings.value = res.data.items.filter((l: any) => l.donorId === authStore.user?.id);
    }
  } catch (err) {
    console.error('Failed to load listings', err);
  } finally {
    loading.value = false;
  }
}

async function handleCancel(id: string) {
  if (!confirm('Are you sure you want to cancel this listing? Any active claims will be updated.')) {
    return;
  }
  try {
    await api.post(`/listings/${id}/cancel`);
    await loadListings();
  } catch (err: any) {
    alert(err.message || 'Failed to cancel listing');
  }
}

onMounted(() => {
  loadListings();
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 1rem 1.25rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.data-table th {
  background: #f9fafb;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.action-cell {
  white-space: nowrap;
}

.ml-2 {
  margin-left: 0.5rem;
}

.p-8 { padding: 2rem; }
.p-12 { padding: 3rem; }
</style>

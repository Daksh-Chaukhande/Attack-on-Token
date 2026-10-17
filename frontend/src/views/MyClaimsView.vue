<template>
  <div class="container py-8">
    <div class="header-row mb-6">
      <div>
        <h1>My Claimed Reservations</h1>
        <p class="text-muted">Track your reserved surplus food pickups and QR verification tokens.</p>
      </div>
      <router-link to="/listings" class="btn btn-primary">
        🍲 Browse More Food
      </router-link>
    </div>

    <div v-if="loading" class="card text-center p-8 text-muted">
      Loading your reservations...
    </div>

    <div v-else-if="claims.length === 0" class="card empty-state text-center p-12">
      <h3>No Food Claims Yet</h3>
      <p class="text-muted mt-1">Browse available surplus food donations and reserve meals for distribution.</p>
      <router-link to="/listings" class="btn btn-primary mt-4">
        Explore Available Listings
      </router-link>
    </div>

    <div v-else class="card table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Food Item</th>
              <th>Reserved Qty</th>
              <th>Status</th>
              <th>Pickup Deadline</th>
              <th>Verification Code</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="claim in claims" :key="claim.id">
              <td class="font-bold">
                <router-link :to="`/listings/${claim.listingId}`">{{ claim.listing?.title }}</router-link>
              </td>
              <td>{{ claim.quantity }} {{ claim.quantityUnit }}</td>
              <td>
                <span :class="['badge', `badge-${claim.status.toLowerCase()}`]">
                  {{ claim.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="text-sm font-semibold text-warning">
                {{ formatDateTime(claim.pickupDeadline) }}
              </td>
              <td>
                <span class="code-pill">{{ claim.verificationCode }}</span>
              </td>
              <td class="action-cell">
                <router-link :to="`/claims/${claim.id}`" class="btn btn-sm btn-primary">
                  📱 Show QR
                </router-link>
                <button
                  v-if="claim.status === 'PENDING_PICKUP'"
                  @click="handleCancel(claim.id)"
                  class="btn btn-sm btn-outline ml-2"
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

const claims = ref<any[]>([]);
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

async function loadClaims() {
  loading.value = true;
  try {
    const res = await api.get('/claims/my');
    if (res.success && res.data.claims) {
      claims.value = res.data.claims;
    }
  } catch (err) {
    console.error('Failed to load claims', err);
  } finally {
    loading.value = false;
  }
}

async function handleCancel(claimId: string) {
  if (!confirm('Are you sure you want to cancel this claim? The reserved quantity will return to the donor.')) {
    return;
  }
  try {
    await api.post(`/claims/${claimId}/cancel`, {
      reason: 'Volunteer cannot make the pickup',
    });
    await loadClaims();
  } catch (err: any) {
    alert(err.message || 'Failed to cancel claim');
  }
}

onMounted(() => {
  loadClaims();
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

.code-pill {
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: #f3f4f6;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
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

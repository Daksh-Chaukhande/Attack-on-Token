<template>
  <div class="container py-8">
    <div v-if="loading" class="card text-center p-8 text-muted">
      Loading claim details...
    </div>

    <div v-else-if="!claim" class="card text-center p-8">
      <h2>Claim Not Found</h2>
      <p class="text-muted mt-2">Could not find the requested reservation.</p>
      <router-link to="/my-claims" class="btn btn-primary mt-4">Go to My Claims</router-link>
    </div>

    <div v-else class="claim-container card">
      <div class="claim-header text-center">
        <span :class="['badge', `badge-${claim.status.toLowerCase()}`]">
          {{ claim.status.replace('_', ' ') }}
        </span>
        <h1 class="mt-2">{{ claim.listing?.title }}</h1>
        <p class="text-muted">
          Reserved Quantity: <strong>{{ claim.quantity }} {{ claim.quantityUnit }}</strong>
        </p>
      </div>

      <!-- QR Code Section -->
      <div class="qr-box text-center mt-6">
        <div class="qr-wrapper card" v-if="claim.qrCodeDataUrl">
          <img :src="claim.qrCodeDataUrl" alt="Pickup Verification QR Code" class="qr-img" />
        </div>
        <div class="mt-4">
          <span class="text-muted text-sm">6-Digit Backup Verification Code:</span>
          <div class="code-display">{{ claim.verificationCode }}</div>
        </div>
        <p class="help-text mt-2 text-sm text-muted">
          Present this QR code or 6-digit number to the donor at pickup. Once scanned, the handover is recorded immediately.
        </p>
      </div>

      <hr class="divider" />

      <!-- Logistics & Location -->
      <div class="info-section">
        <h3>Pickup Location & Guidelines</h3>
        <p class="mt-2 font-medium">📍 {{ claim.listing?.pickupAddress }}</p>
        <div class="pickup-window mt-2 text-sm">
          <strong>Safe Pickup Deadline:</strong> {{ formatDateTime(claim.pickupDeadline) }}
        </div>

        <div v-if="claim.listing?.specialInstructions" class="special-note mt-4 p-3 bg-light rounded">
          <strong>Donor's Instructions:</strong>
          <p class="mt-1 text-sm">{{ claim.listing.specialInstructions }}</p>
        </div>
      </div>

      <!-- Verification Info if completed -->
      <div v-if="claim.status === 'COMPLETED' && claim.pickupVerification" class="verification-info mt-6 p-4 rounded bg-green-light">
        <h4>✅ Pickup Verified & Complete</h4>
        <p class="text-sm mt-1">Verified on {{ formatDateTime(claim.collectedAt) }} via {{ claim.pickupVerification.verificationMethod }}</p>
      </div>

      <!-- Action Footer -->
      <div class="actions-footer mt-6">
        <router-link to="/my-claims" class="btn btn-outline">
          ← Back to Claims
        </router-link>
        <button
          v-if="claim.status === 'PENDING_PICKUP'"
          @click="handleCancel"
          class="btn btn-danger"
        >
          Cancel Reservation
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';

const route = useRoute();
const router = useRouter();

const claim = ref<any>(null);
const loading = ref(true);

function formatDateTime(str?: string) {
  if (!str) return 'N/A';
  return new Date(str).toLocaleString();
}

async function loadClaim() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const res = await api.get(`/claims/${id}`);
    if (res.success && res.data.claim) {
      claim.value = res.data.claim;
    }
  } catch (err) {
    console.error('Failed to load claim', err);
  } finally {
    loading.value = false;
  }
}

async function handleCancel() {
  if (!confirm('Are you sure you want to cancel this reservation? The food will be returned to the donor listing.')) {
    return;
  }
  try {
    await api.post(`/claims/${claim.value.id}/cancel`, {
      reason: 'Volunteer cancelled reservation via claim page',
    });
    await loadClaim();
  } catch (err: any) {
    alert(err.message || 'Failed to cancel reservation');
  }
}

onMounted(() => {
  loadClaim();
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.claim-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 2.5rem;
}

.qr-box {
  background: #f9fafb;
  border-radius: var(--radius-lg);
  padding: 2rem;
  border: 1px solid var(--border-color);
}

.qr-wrapper {
  display: inline-block;
  padding: 1rem;
  background: #ffffff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.qr-img {
  width: 220px;
  height: 220px;
  display: block;
}

.code-display {
  font-family: monospace;
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--primary-dark);
  margin-top: 0.25rem;
}

.divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 2rem 0;
}

.bg-green-light {
  background: #dcfce7;
  color: #14532d;
  border: 1px solid #bbf7d0;
}

.actions-footer {
  display: flex;
  justify-content: space-between;
}
</style>

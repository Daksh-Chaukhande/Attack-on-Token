<template>
  <div class="container py-8">
    <div v-if="loading" class="loading-box">
      <p>Loading food listing details...</p>
    </div>

    <div v-else-if="!listing" class="card empty-box">
      <h2>Listing Not Found</h2>
      <p class="text-muted">This food listing may have expired or been removed.</p>
      <router-link to="/listings" class="btn btn-primary mt-4">Browse Other Listings</router-link>
    </div>

    <div v-else class="listing-layout">
      <!-- Left Column: Details -->
      <div class="detail-main">
        <div class="img-hero card mb-6" v-if="listing.imageUrl">
          <img :src="listing.imageUrl" :alt="listing.title" class="hero-image" />
        </div>

        <div class="card mb-6">
          <div class="tags-row mb-2">
            <span class="badge-tag">{{ listing.category }}</span>
            <span class="badge-tag dietary-tag">{{ listing.foodType }}</span>
            <span :class="['badge', `badge-${listing.status.toLowerCase()}`]">
              {{ listing.status.replace('_', ' ') }}
            </span>
          </div>

          <h1 class="listing-title">{{ listing.title }}</h1>
          <p class="listing-desc">{{ listing.description }}</p>

          <hr class="divider" />

          <h3>Food Safety & Storage Details</h3>
          <div class="specs-grid mt-4">
            <div class="spec-card">
              <span class="spec-label">Storage Requirement</span>
              <span class="spec-value font-bold">{{ listing.storageRequirement }}</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">Allergens</span>
              <span class="spec-value">{{ parseAllergens(listing.allergens) }}</span>
            </div>
            <div class="spec-card" v-if="listing.safeConsumptionDeadline">
              <span class="spec-label">Safe Consumption Deadline</span>
              <span class="spec-value">{{ formatDateTime(listing.safeConsumptionDeadline) }}</span>
            </div>
            <div class="spec-card" v-if="listing.preparationDate">
              <span class="spec-label">Preparation Time</span>
              <span class="spec-value">{{ formatDateTime(listing.preparationDate) }}</span>
            </div>
          </div>
        </div>

        <!-- Pickup Location Card -->
        <div class="card mb-6">
          <h3>Pickup Location & Logistics</h3>
          <p class="mt-2 font-medium">📍 {{ listing.pickupAddress }}</p>
          <div class="mt-4 p-3 bg-light rounded" v-if="listing.specialInstructions">
            <strong>Donor Instructions:</strong>
            <p class="text-sm mt-1">{{ listing.specialInstructions }}</p>
          </div>
        </div>
      </div>

      <!-- Right Column: Claim & Action Sidebar -->
      <div class="detail-sidebar">
        <div class="card sidebar-card sticky-sidebar">
          <div class="inventory-status">
            <div class="stat-group">
              <span class="stat-number text-primary">{{ listing.remainingQuantity }}</span>
              <span class="stat-unit">{{ listing.quantityUnit }} Remaining</span>
            </div>
            <div class="stat-group text-right">
              <span class="stat-number text-muted">{{ listing.totalQuantity }}</span>
              <span class="stat-unit">Total Donated</span>
            </div>
          </div>

          <div class="countdown-box mt-4">
            <span class="countdown-label">Pickup Closes In:</span>
            <span class="countdown-val font-bold text-warning">{{ formatTimeLeft(listing.pickupEndTime) }}</span>
            <span class="countdown-deadline">{{ formatDateTime(listing.pickupEndTime) }}</span>
          </div>

          <!-- Claim Action Button -->
          <div class="sidebar-actions mt-6">
            <template v-if="listing.status === 'AVAILABLE' || listing.status === 'PARTIALLY_CLAIMED'">
              <template v-if="authStore.isAuthenticated">
                <button
                  v-if="!isOwnListing"
                  @click="showClaimModal = true"
                  class="btn btn-primary w-full"
                >
                  🤝 Claim This Food
                </button>
                <div v-else class="alert-info text-center">
                  This is your own donation listing.
                </div>
              </template>
              <template v-else>
                <router-link :to="`/login?redirect=/listings/${listing.id}`" class="btn btn-primary w-full">
                  Sign In to Claim
                </router-link>
              </template>
            </template>
            <template v-else>
              <button disabled class="btn btn-secondary w-full cursor-not-allowed">
                No Longer Available ({{ listing.status }})
              </button>
            </template>
          </div>

          <!-- Donor Organization Info -->
          <div class="donor-box mt-6" v-if="listing.donor">
            <h4>Donated by:</h4>
            <div class="donor-profile mt-2">
              <span class="donor-name font-bold">{{ listing.organization?.name || listing.donor.name }}</span>
              <span class="org-type text-muted text-sm">{{ listing.organization?.type || 'Food Donor' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Claim Modal -->
    <div v-if="showClaimModal" class="modal-overlay" @click.self="showClaimModal = false">
      <div class="modal-content">
        <h2>Reserve Surplus Food</h2>
        <p class="text-muted text-sm mt-1">Specify the quantity you can safely collect and distribute.</p>

        <form @submit.prevent="handleClaimSubmit" class="mt-4">
          <div class="form-group">
            <label class="form-label">
              Quantity to Claim (max: {{ listing.remainingQuantity }} {{ listing.quantityUnit }}):
            </label>
            <input
              v-model.number="claimQuantity"
              type="number"
              min="1"
              :max="listing.remainingQuantity"
              step="any"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Notes for Donor (Optional):</label>
            <textarea
              v-model="claimNotes"
              rows="3"
              placeholder="e.g. Bringing insulated boxes, arriving at 4:30 PM for shelter delivery"
              class="form-textarea"
            ></textarea>
          </div>

          <div v-if="claimError" class="alert-danger mb-4">
            {{ claimError }}
          </div>

          <div class="modal-actions">
            <button type="button" @click="showClaimModal = false" class="btn btn-outline">
              Cancel
            </button>
            <button type="submit" :disabled="submittingClaim" class="btn btn-primary">
              {{ submittingClaim ? 'Confirming...' : 'Confirm Reservation' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const listing = ref<any>(null);
const loading = ref(true);

const showClaimModal = ref(false);
const claimQuantity = ref(1);
const claimNotes = ref('');
const submittingClaim = ref(false);
const claimError = ref('');

const isOwnListing = computed(() => {
  return authStore.user && listing.value && authStore.user.id === listing.value.donorId;
});

function formatTimeLeft(deadlineStr: string) {
  const diff = new Date(deadlineStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

function parseAllergens(allergensStr: string | null) {
  if (!allergensStr) return 'None specified';
  try {
    const arr = JSON.parse(allergensStr);
    return Array.isArray(arr) ? arr.join(', ') : allergensStr;
  } catch {
    return allergensStr;
  }
}

async function handleClaimSubmit() {
  submittingClaim.value = true;
  claimError.value = '';

  try {
    const res = await api.post(`/listings/${listing.value.id}/claims`, {
      quantity: claimQuantity.value,
      notes: claimNotes.value,
    });

    if (res.success && res.data.claim) {
      showClaimModal.value = false;
      router.push(`/claims/${res.data.claim.id}`);
    }
  } catch (err: any) {
    claimError.value = err.message || 'Failed to claim listing. Please try again.';
  } finally {
    submittingClaim.value = false;
  }
}

onMounted(async () => {
  try {
    const id = route.params.id as string;
    const res = await api.get(`/listings/${id}`);
    if (res.success && res.data.listing) {
      listing.value = res.data.listing;
      claimQuantity.value = Math.min(5, Number(res.data.listing.remainingQuantity));
    }
  } catch (err) {
    console.error('Failed to load listing', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.listing-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.hero-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: var(--radius-lg);
}

.listing-title {
  font-size: 1.85rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  line-height: 1.25;
}

.listing-desc {
  font-size: 1.05rem;
  color: #4b5563;
  line-height: 1.6;
}

.divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 1.5rem 0;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.spec-card {
  background: #f9fafb;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
}

.spec-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.spec-value {
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.sticky-sidebar {
  position: sticky;
  top: 90px;
}

.inventory-status {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 800;
  display: block;
}

.stat-unit {
  font-size: 0.825rem;
  color: var(--text-muted);
  font-weight: 600;
}

.countdown-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.countdown-label {
  font-size: 0.75rem;
  color: #92400e;
  font-weight: 700;
}

.countdown-val {
  font-size: 1.25rem;
}

.countdown-deadline {
  font-size: 0.75rem;
  color: #b45309;
}

.alert-info {
  background: #eff6ff;
  color: #1e40af;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.w-full {
  width: 100%;
}

@media (max-width: 900px) {
  .listing-layout {
    grid-template-columns: 1fr;
  }
}
</style>

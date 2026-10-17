<template>
  <div class="container py-8">
    <div class="card form-container">
      <div class="mb-6">
        <h2>Post Surplus Food Donation</h2>
        <p class="text-muted text-sm mt-1">
          Publish edible surplus food for verified community collection before it reaches expiration.
        </p>
      </div>

      <div v-if="errorMessage" class="alert-danger mb-4">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Listing Title *</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="e.g. 20 Portions Warm Dal Makhani & Roti"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Detailed Description *</label>
          <textarea
            v-model="form.description"
            rows="3"
            required
            minlength="10"
            placeholder="Describe the items, condition, how it was packaged, and intended consumers..."
            class="form-textarea"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Category *</label>
            <select v-model="form.category" class="form-select" required>
              <option value="COOKED_MEALS">Cooked Meals</option>
              <option value="BAKERY">Bakery</option>
              <option value="FRUITS">Fruits</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="PACKAGED_FOOD">Packaged Food</option>
              <option value="GROCERIES">Groceries</option>
              <option value="DAIRY">Dairy</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Food Type *</label>
            <select v-model="form.foodType" class="form-select" required>
              <option value="VEGETARIAN">Vegetarian</option>
              <option value="VEGAN">Vegan</option>
              <option value="NON_VEGETARIAN">Non-Vegetarian</option>
              <option value="EGGETARIAN">Eggetarian</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Total Quantity *</label>
            <input
              v-model.number="form.totalQuantity"
              type="number"
              min="0.1"
              step="any"
              required
              class="form-input"
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Unit of Measure *</label>
            <input
              v-model="form.quantityUnit"
              type="text"
              required
              placeholder="boxes, kg, portions, liters, packets"
              class="form-input"
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Estimated Servings *</label>
            <input
              v-model.number="form.estimatedServings"
              type="number"
              min="1"
              required
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Storage Requirement</label>
            <select v-model="form.storageRequirement" class="form-select">
              <option value="AMBIENT">Ambient (Room Temperature)</option>
              <option value="REFRIGERATED">Refrigerated (0 - 5°C)</option>
              <option value="FROZEN">Frozen (-18°C)</option>
              <option value="HOT_HOLD">Hot Hold (> 63°C)</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Pickup Start Time *</label>
            <input
              v-model="form.pickupStartTime"
              type="datetime-local"
              required
              class="form-input"
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Pickup Deadline (Expiration) *</label>
            <input
              v-model="form.pickupEndTime"
              type="datetime-local"
              required
              class="form-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Pickup Address *</label>
          <input
            v-model="form.pickupAddress"
            type="text"
            required
            placeholder="e.g. 42 Brigade Road, Rear Kitchen Dock"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Special Handover Instructions (Optional)</label>
          <input
            v-model="form.specialInstructions"
            type="text"
            placeholder="e.g. Ring buzzer at backdoor alley, bring clean cooler bags"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Photo Image URL (Optional)</label>
          <input
            v-model="form.imageUrl"
            type="url"
            placeholder="https://images.unsplash.com/..."
            class="form-input"
          />
        </div>

        <div class="form-actions mt-6">
          <router-link to="/dashboard" class="btn btn-outline">Cancel</router-link>
          <button type="submit" :disabled="submitting" class="btn btn-primary">
            {{ submitting ? 'Publishing...' : 'Publish Food Listing' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const now = new Date();
const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

const form = reactive({
  title: '',
  description: '',
  category: 'COOKED_MEALS',
  foodType: 'VEGETARIAN',
  totalQuantity: 10,
  quantityUnit: 'boxes',
  estimatedServings: 10,
  storageRequirement: 'AMBIENT',
  pickupStartTime: now.toISOString().slice(0, 16),
  pickupEndTime: fourHoursLater.toISOString().slice(0, 16),
  pickupAddress: authStore.user?.profile?.address || 'Brigade Road, Bengaluru',
  specialInstructions: '',
  imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
});

const submitting = ref(false);
const errorMessage = ref('');

onMounted(() => {
  if (authStore.user?.organizations?.[0]?.address) {
    form.pickupAddress = authStore.user.organizations[0].address;
  }
});

async function handleSubmit() {
  submitting.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      ...form,
      pickupStartTime: new Date(form.pickupStartTime).toISOString(),
      pickupEndTime: new Date(form.pickupEndTime).toISOString(),
    };

    const res = await api.post('/listings', payload);
    if (res.success && res.data.listing) {
      router.push(`/listings/${res.data.listing.id}`);
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to create listing. Please verify inputs.';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.form-container {
  max-width: 780px;
  margin: 0 auto;
  padding: 2.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.flex-1 {
  flex: 1;
  min-width: 200px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}
</style>

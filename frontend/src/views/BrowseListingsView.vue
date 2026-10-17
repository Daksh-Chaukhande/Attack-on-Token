<template>
  <div class="container py-8">
    <div class="page-header">
      <div>
        <h1>Available Food Donations</h1>
        <p class="text-muted">Browse real-time listings of surplus food ready for collection.</p>
      </div>
      <router-link v-if="authStore.isDonor" to="/listings/create" class="btn btn-primary">
        + Post Surplus Food
      </router-link>
    </div>

    <!-- Filters Section -->
    <div class="card filter-card mb-8">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by title, description, or pickup address..."
          class="form-input"
          @input="applyFilters"
        />
      </div>

      <div class="filter-row mt-4">
        <div class="filter-group">
          <label class="filter-label">Category:</label>
          <select v-model="selectedCategory" class="form-select" @change="applyFilters">
            <option value="">All Categories</option>
            <option value="COOKED_MEALS">Cooked Meals</option>
            <option value="BAKERY">Bakery</option>
            <option value="FRUITS">Fruits</option>
            <option value="VEGETABLES">Vegetables</option>
            <option value="PACKAGED_FOOD">Packaged Food</option>
            <option value="GROCERIES">Groceries</option>
            <option value="DAIRY">Dairy</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Dietary Preference:</label>
          <select v-model="selectedFoodType" class="form-select" @change="applyFilters">
            <option value="">All Types</option>
            <option value="VEGETARIAN">Vegetarian</option>
            <option value="VEGAN">Vegan</option>
            <option value="NON_VEGETARIAN">Non-Vegetarian</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Storage:</label>
          <select v-model="selectedStorage" class="form-select" @change="applyFilters">
            <option value="">Any Storage</option>
            <option value="AMBIENT">Ambient</option>
            <option value="REFRIGERATED">Refrigerated</option>
            <option value="FROZEN">Frozen</option>
            <option value="HOT_HOLD">Hot Hold</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Listings Grid -->
    <div v-if="loading" class="loading-box">
      <p>Loading available food listings...</p>
    </div>

    <div v-else-if="filteredListings.length === 0" class="card empty-box">
      <h3>No listings match your criteria</h3>
      <p class="text-muted">Try adjusting your filters or search keywords.</p>
    </div>

    <div v-else class="grid-cols-3">
      <div v-for="item in filteredListings" :key="item.id" class="card listing-item">
        <div class="img-container">
          <img
            :src="item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'"
            :alt="item.title"
            class="food-img"
          />
          <span :class="['badge', `badge-${item.status.toLowerCase()}`]">
            {{ item.status.replace('_', ' ') }}
          </span>
        </div>

        <div class="content-box">
          <div class="tags-row">
            <span class="badge-tag">{{ item.category }}</span>
            <span class="badge-tag dietary-tag">{{ item.foodType }}</span>
          </div>

          <h3 class="item-title">
            <router-link :to="`/listings/${item.id}`">{{ item.title }}</router-link>
          </h3>
          <p class="item-desc">{{ item.description }}</p>

          <div class="specs-grid">
            <div class="spec-cell">
              <span class="spec-label">Remaining</span>
              <span class="spec-val font-bold text-primary">{{ item.remainingQuantity }} {{ item.quantityUnit }}</span>
            </div>
            <div class="spec-cell">
              <span class="spec-label">Time Remaining</span>
              <span class="spec-val font-semibold text-warning">{{ formatTimeLeft(item.pickupEndTime) }}</span>
            </div>
          </div>

          <div class="location-row">
            <span class="loc-icon">📍</span>
            <span class="loc-text">{{ item.pickupAddress }}</span>
          </div>

          <div class="action-row">
            <router-link :to="`/listings/${item.id}`" class="btn btn-outline btn-sm w-full">
              View Details & Claim
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const listings = ref<any[]>([]);
const loading = ref(true);

const searchQuery = ref('');
const selectedCategory = ref('');
const selectedFoodType = ref('');
const selectedStorage = ref('');

function formatTimeLeft(deadlineStr: string) {
  const diff = new Date(deadlineStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

const filteredListings = computed(() => {
  return listings.value.filter((item) => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchLoc = item.pickupAddress?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }
    if (selectedCategory.value && item.category !== selectedCategory.value) {
      return false;
    }
    if (selectedFoodType.value && item.foodType !== selectedFoodType.value) {
      return false;
    }
    if (selectedStorage.value && item.storageRequirement !== selectedStorage.value) {
      return false;
    }
    return true;
  });
});

function applyFilters() {
  // Reactive computed handles filtering
}

onMounted(async () => {
  try {
    const res = await api.get('/listings?limit=50');
    if (res.success && res.data.items) {
      listings.value = res.data.items;
    }
  } catch (err) {
    console.error('Failed to load listings', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.filter-card {
  padding: 1.25rem;
}

.mb-8 {
  margin-bottom: 2rem;
}

.mt-4 {
  margin-top: 1rem;
}

.filter-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 180px;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
  display: block;
}

.listing-item {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.img-container {
  position: relative;
  height: 180px;
  background: #f3f4f6;
}

.food-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-container .badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.content-box {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.tags-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.badge-tag {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--primary-light);
  color: var(--primary-dark);
}

.dietary-tag {
  background: #f3f4f6;
  color: #374151;
}

.item-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
  line-height: 1.35;
}

.item-title a {
  color: var(--text-main);
}
.item-title a:hover {
  color: var(--primary);
}

.item-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 1rem;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: #f9fafb;
  border-radius: var(--radius-md);
  padding: 0.75rem;
  margin-bottom: 0.85rem;
}

.spec-cell {
  display: flex;
  flex-direction: column;
}

.spec-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.spec-val {
  font-size: 0.875rem;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.825rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.loc-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-row {
  margin-top: auto;
}

.w-full {
  width: 100%;
}

.empty-box {
  text-align: center;
  padding: 3rem 1.5rem;
}
</style>

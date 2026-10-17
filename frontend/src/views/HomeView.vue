<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container hero-container">
        <div class="hero-content">
          <div class="pill-badge">🌱 Community Food Redistribution</div>
          <h1 class="hero-title">Rescue surplus food. Nourish your community.</h1>
          <p class="hero-subtitle">
            SharePlate connects restaurants, artisan bakeries, and food businesses with local volunteers and shelters to redirect wholesome surplus meals before they go to waste.
          </p>
          <div class="hero-actions">
            <router-link to="/listings" class="btn btn-primary">
              🍲 Browse Available Food
            </router-link>
            <router-link to="/register" class="btn btn-secondary">
              🤝 Become a Donor / Volunteer
            </router-link>
          </div>
          <div class="hero-metrics">
            <div class="metric-item">
              <span class="metric-num">100%</span>
              <span class="metric-label">Verified Handover via QR</span>
            </div>
            <div class="metric-item">
              <span class="metric-num">Zero</span>
              <span class="metric-label">Platform Fees</span>
            </div>
            <div class="metric-item">
              <span class="metric-num">Real-time</span>
              <span class="metric-label">Expiry & Claim Tracking</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Available Listings Section -->
    <section class="container py-12">
      <div class="section-header">
        <div>
          <h2>Available for Immediate Pickup</h2>
          <p class="section-sub">Wholesome food listings ready for verified pickup right now.</p>
        </div>
        <router-link to="/listings" class="view-all-link">View all listings →</router-link>
      </div>

      <div v-if="loading" class="loading-state">
        <p>Loading available food items...</p>
      </div>

      <div v-else-if="listings.length === 0" class="empty-state card">
        <p>No active food listings right now. Check back shortly!</p>
      </div>

      <div v-else class="grid-cols-3">
        <div v-for="item in listings" :key="item.id" class="card listing-card">
          <div class="card-img-wrapper" v-if="item.imageUrl">
            <img :src="item.imageUrl" :alt="item.title" class="listing-img" />
            <span :class="['badge', `badge-${item.status.toLowerCase()}`]">
              {{ item.status.replace('_', ' ') }}
            </span>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="category-tag">{{ item.category }}</span>
              <span class="foodtype-tag">{{ item.foodType }}</span>
            </div>
            <h3 class="listing-title">
              <router-link :to="`/listings/${item.id}`">{{ item.title }}</router-link>
            </h3>
            <p class="listing-desc">{{ item.description }}</p>
            
            <div class="listing-specs">
              <div class="spec-row">
                <span class="spec-label">Remaining:</span>
                <span class="spec-val font-bold text-primary">{{ item.remainingQuantity }} {{ item.quantityUnit }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Expires in:</span>
                <span class="spec-val text-warning">{{ formatTimeLeft(item.pickupEndTime) }}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Pickup:</span>
                <span class="spec-val text-truncate">{{ item.pickupAddress }}</span>
              </div>
            </div>

            <div class="card-footer">
              <router-link :to="`/listings/${item.id}`" class="btn btn-outline btn-sm w-full">
                View & Reserve
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Summary -->
    <section class="how-section">
      <div class="container">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <h2>How SharePlate Works</h2>
          <p class="section-sub">A closed-loop protocol ensuring food safety, accountability, and speed.</p>
        </div>

        <div class="steps-grid">
          <div class="step-card card">
            <div class="step-num">1</div>
            <h3>Donors List Surplus</h3>
            <p>Restaurants, bakeries, or supermarkets publish edible surplus with pickup deadlines, portions, and temperature requirements.</p>
          </div>
          <div class="step-card card">
            <div class="step-num">2</div>
            <h3>Volunteers Claim</h3>
            <p>Authorized volunteers, NGOs, or community kitchens claim available portions in real time with atomic inventory locking.</p>
          </div>
          <div class="step-card card">
            <div class="step-num">3</div>
            <h3>Instant QR Verification</h3>
            <p>The donor scans the claimant’s secure single-use QR code or enters the 6-digit code to verify physical handover.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client';

const listings = ref<any[]>([]);
const loading = ref(true);

function formatTimeLeft(deadlineStr: string) {
  const diff = new Date(deadlineStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

onMounted(async () => {
  try {
    const res = await api.get('/listings?limit=6');
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
.hero-section {
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #ffffff 100%);
  padding: 4.5rem 0 3.5rem;
  border-bottom: 1px solid var(--border-color);
}

.hero-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.pill-badge {
  display: inline-block;
  background: #d1fae5;
  color: #065f46;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  margin-bottom: 1.25rem;
  letter-spacing: 0.025em;
}

.hero-title {
  font-size: 2.85rem;
  font-weight: 800;
  line-height: 1.15;
  max-width: 800px;
  color: #111827;
  margin-bottom: 1.25rem;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: #4b5563;
  max-width: 680px;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 3rem;
}

.hero-metrics {
  display: flex;
  gap: 3rem;
  justify-content: center;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 2rem;
}

.metric-num {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary);
}

.metric-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.py-12 {
  padding: 3.5rem 1.25rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.75rem;
  font-weight: 800;
}

.section-sub {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.view-all-link {
  font-weight: 700;
  font-size: 0.9rem;
}

.listing-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.listing-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.card-img-wrapper {
  position: relative;
  height: 180px;
  background: #e5e7eb;
}

.listing-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-img-wrapper .badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.category-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary-dark);
  background: var(--primary-light);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.foodtype-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: #374151;
  background: #f3f4f6;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.listing-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.listing-title a {
  color: var(--text-main);
}
.listing-title a:hover {
  color: var(--primary);
}

.listing-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 1rem;
}

.listing-specs {
  background: #f9fafb;
  border-radius: var(--radius-md);
  padding: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.825rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.spec-row {
  display: flex;
  justify-content: space-between;
}

.spec-label {
  color: var(--text-muted);
}

.text-truncate {
  max-width: 170px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  margin-top: auto;
}

.w-full {
  width: 100%;
}

.how-section {
  background: #f3f4f6;
  padding: 4.5rem 0;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.step-card {
  position: relative;
  padding: 2rem;
}

.step-num {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  margin-bottom: 1rem;
}
</style>

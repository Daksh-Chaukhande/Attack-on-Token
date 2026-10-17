<template>
  <div class="container py-12">
    <div class="text-center max-w-3xl mx-auto mb-12">
      <span class="badge badge-available mb-2">Platform Protocol</span>
      <h1>How SharePlate Works</h1>
      <p class="text-muted text-lg mt-2">
        A transparent, closed-loop food redistribution network designed to minimize waste and maximize community food security safely.
      </p>
    </div>

    <!-- 4 Step Flow -->
    <div class="workflow-steps mb-12">
      <div class="step-box card">
        <div class="step-badge">Phase 1</div>
        <h3>Surplus Food Publication</h3>
        <p class="text-muted text-sm mt-2">
          Verified food businesses (restaurants, bakeries, caterers) list consumable surplus meals with strict safe-pickup deadlines, allergen disclosures, and temperature requirements.
        </p>
      </div>

      <div class="step-box card">
        <div class="step-badge">Phase 2</div>
        <h3>Atomic Reservation</h3>
        <p class="text-muted text-sm mt-2">
          Registered volunteers or NGO coordinators claim the necessary quantity. An atomic database transaction locks inventory to prevent overclaiming and generates a unique one-time QR token.
        </p>
      </div>

      <div class="step-box card">
        <div class="step-badge">Phase 3</div>
        <h3>Physical Handover & Verification</h3>
        <p class="text-muted text-sm mt-2">
          At the donor's premises, the donor scans the volunteer's QR code using our in-browser camera scanner (or enters their 6-digit code), instantly recording completed handover.
        </p>
      </div>

      <div class="step-box card">
        <div class="step-badge">Phase 4</div>
        <h3>Community Redistribution</h3>
        <p class="text-muted text-sm mt-2">
          Rescued food is transported in hygienic containers and served at local soup kitchens, transitional shelters, or mutual-aid community pantries.
        </p>
      </div>
    </div>

    <!-- Safety & Worker Mechanisms -->
    <div class="card p-8 mb-12 bg-light">
      <h2>Automated Expiry & Concurrency Architecture</h2>
      <div class="grid-2 mt-4">
        <div>
          <h4>⏱️ Auto-Expiration Worker</h4>
          <p class="text-muted text-sm mt-1">
            A background daemon polls database records periodically. Any listing whose pickup deadline passes without reservation is automatically transitioned to <code>EXPIRED</code> status to ensure recipients only receive fresh food.
          </p>
        </div>
        <div>
          <h4>🔒 Cryptographic Verification</h4>
          <p class="text-muted text-sm mt-1">
            Every QR code contains a high-entropy cryptographically secure token that enforces one-time use semantics. Once verified, tokens are burned and cannot be scanned again.
          </p>
        </div>
      </div>
    </div>

    <div class="text-center">
      <router-link to="/listings" class="btn btn-primary">
        Explore Active Food Listings
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.py-12 {
  padding: 4rem 1.25rem;
}

.max-w-3xl {
  max-width: 768px;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.mb-12 {
  margin-bottom: 3rem;
}

.text-lg {
  font-size: 1.15rem;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.step-box {
  position: relative;
  padding: 2rem 1.5rem;
}

.step-badge {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.bg-light {
  background: #f9fafb;
}

.p-8 {
  padding: 2rem;
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>

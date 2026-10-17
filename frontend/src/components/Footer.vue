<template>
  <footer class="footer">
    <div class="container footer-content">
      <div class="footer-col">
        <div class="brand">
          <span class="brand-icon">🍲</span>
          <span class="brand-name">Share<span class="text-primary">Plate</span></span>
        </div>
        <p class="footer-desc">
          Connecting restaurants, bakeries, community kitchens, and volunteers to eliminate surplus food waste and nourish local communities safely.
        </p>
      </div>

      <div class="footer-col">
        <h4>Platform</h4>
        <ul>
          <li><router-link to="/listings">Browse Available Food</router-link></li>
          <li><router-link to="/how-it-works">How It Works</router-link></li>
          <li><router-link to="/food-safety">Food Safety Standards</router-link></li>
          <li><router-link to="/verify-pickup">QR Pickup Verification</router-link></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Get Involved</h4>
        <ul>
          <li><router-link to="/register">Register as Donor</router-link></li>
          <li><router-link to="/register">Volunteer for Delivery</router-link></li>
          <li><router-link to="/register">NGO / Shelter Onboarding</router-link></li>
          <li><router-link to="/login">Account Sign In</router-link></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Developer & API</h4>
        <ul>
          <li><a href="http://localhost:4000/api/docs" target="_blank">Swagger OpenAPI Docs</a></li>
          <li><a href="http://localhost:4000/api/v1/health" target="_blank">System Health Check</a></li>
          <li><a href="http://localhost:4000/api/v1/ready" target="_blank">Database Readiness</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container bottom-content">
        <p>© 2026 SharePlate Platform. Built for zero-waste community nourishment.</p>
        <p class="tech-stack">Powered by Vue 3 • Express • TypeScript • MySQL • Prisma</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: #111827;
  color: #9ca3af;
  padding-top: 3.5rem;
  margin-top: 5rem;
  border-top: 1px solid #1f2937;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2.5rem;
  padding-bottom: 3rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 1rem;
}

.text-primary {
  color: #10b981;
}

.footer-desc {
  font-size: 0.875rem;
  line-height: 1.6;
  max-width: 320px;
}

.footer-col h4 {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.footer-col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.footer-col a {
  color: #9ca3af;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.footer-col a:hover {
  color: #10b981;
}

.footer-bottom {
  border-top: 1px solid #1f2937;
  padding: 1.25rem 0;
  font-size: 0.825rem;
}

.bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.tech-stack {
  color: #6b7280;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
  }
}
</style>

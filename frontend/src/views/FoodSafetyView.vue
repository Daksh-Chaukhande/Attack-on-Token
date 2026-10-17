<template>
  <div class="container py-12">
    <div class="text-center max-w-3xl mx-auto mb-10">
      <span class="badge badge-partially_claimed mb-2">Hygiene & Compliance</span>
      <h1>Food Safety & Temperature Standards</h1>
      <p class="text-muted text-lg mt-2">
        Guidelines for safe handling, packaging, transport, and consumption of redistributed surplus food.
      </p>
    </div>

    <!-- Temperature Danger Zone Card -->
    <div class="card p-8 mb-8">
      <h2>Temperature Control & The Danger Zone</h2>
      <p class="text-muted mt-2">
        Bacteria multiply rapidly between 5°C and 63°C (The Danger Zone). SharePlate strictly requires adhering to the following thermal standards:
      </p>

      <div class="temp-grid mt-6">
        <div class="temp-card hot-hold">
          <span class="temp-val">> 63°C</span>
          <h4>Hot-Hold Meals</h4>
          <p class="text-sm mt-1">Cooked rice, curries, stews, and hot soups must be held above 63°C until collection and consumed within 4 hours.</p>
        </div>

        <div class="temp-card chilled">
          <span class="temp-val">0°C – 5°C</span>
          <h4>Chilled & Dairy</h4>
          <p class="text-sm mt-1">Milk, cheeses, cooked dishes cooled for transport, and yogurts must remain in cold-chain transport below 5°C.</p>
        </div>

        <div class="temp-card ambient">
          <span class="temp-val">Ambient</span>
          <h4>Bakery & Produce</h4>
          <p class="text-sm mt-1">Sourdough loaves, whole unpeeled fruits, dry vegetables, and boxed cereals can be stored and transported in clean dry ambient containers.</p>
        </div>
      </div>
    </div>

    <!-- Allergen Disclosures -->
    <div class="card p-8 mb-8">
      <h2>Mandatory Allergen Disclosures</h2>
      <p class="text-muted mt-2">
        Food donors must declare known major allergens on every listing:
      </p>
      <div class="allergens-list mt-4">
        <span class="allergen-pill">Peanuts & Tree Nuts</span>
        <span class="allergen-pill">Dairy / Lactose</span>
        <span class="allergen-pill">Gluten / Wheat</span>
        <span class="allergen-pill">Soybeans</span>
        <span class="allergen-pill">Eggs</span>
        <span class="allergen-pill">Fish & Crustaceans</span>
      </div>
    </div>

    <div class="text-center">
      <router-link to="/listings" class="btn btn-primary">
        Back to Available Food Listings
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

.mb-10 {
  margin-bottom: 2.5rem;
}

.mb-8 {
  margin-bottom: 2rem;
}

.p-8 {
  padding: 2rem;
}

.temp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.temp-card {
  padding: 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.temp-val {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.hot-hold {
  background: #fff7ed;
  border-color: #ffedd5;
  color: #9a3412;
}

.chilled {
  background: #eff6ff;
  border-color: #dbeafe;
  color: #1e40af;
}

.ambient {
  background: #f0fdf4;
  border-color: #dcfce7;
  color: #166534;
}

.allergens-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.allergen-pill {
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.825rem;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
}
</style>

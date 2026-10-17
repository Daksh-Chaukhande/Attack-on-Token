<template>
  <div class="container py-8">
    <div class="verify-card card">
      <div class="text-center mb-6">
        <span class="icon-header">📷</span>
        <h1>Verify Food Handover</h1>
        <p class="text-muted text-sm mt-1">
          Scan the claimant's QR code or enter their 6-digit backup code to complete pickup.
        </p>
      </div>

      <!-- Mode Switcher -->
      <div class="mode-tabs mb-6">
        <button
          :class="['tab-btn', { active: activeMode === 'scanner' }]"
          @click="activeMode = 'scanner'"
        >
          📷 Camera QR Scanner
        </button>
        <button
          :class="['tab-btn', { active: activeMode === 'manual' }]"
          @click="activeMode = 'manual'"
        >
          ⌨️ Manual 6-Digit Code
        </button>
      </div>

      <!-- Success Screen -->
      <div v-if="successResult" class="success-box text-center p-6 mb-6">
        <span class="success-icon">🎉</span>
        <h2>Pickup Verified Successfully!</h2>
        <p class="mt-2 text-sm">
          Claim <strong>#{{ successResult.claim?.verificationCode }}</strong> has been verified.
        </p>
        <div class="summary-details mt-4 p-4 rounded bg-white text-left">
          <p><strong>Food:</strong> {{ successResult.claim?.listing?.title }}</p>
          <p><strong>Claimant:</strong> {{ successResult.claim?.claimant?.name }}</p>
          <p><strong>Quantity:</strong> {{ successResult.claim?.quantity }} {{ successResult.claim?.quantityUnit }}</p>
          <p><strong>Status:</strong> COMPLETED</p>
        </div>
        <button @click="resetForm" class="btn btn-primary mt-6">
          Verify Another Pickup
        </button>
      </div>

      <!-- Scanner Mode -->
      <div v-else-if="activeMode === 'scanner'" class="scanner-section">
        <div id="qr-reader" class="qr-reader-box"></div>
        <div class="text-center mt-3 text-sm text-muted">
          Position the volunteer's QR code within the camera frame.
        </div>
      </div>

      <!-- Manual Code Mode -->
      <div v-else class="manual-section">
        <form @submit.prevent="handleManualSubmit">
          <div class="form-group">
            <label class="form-label">6-Digit Alphanumeric Verification Code</label>
            <input
              v-model="manualCode"
              type="text"
              placeholder="e.g. 8K2M9P"
              maxlength="12"
              required
              class="form-input text-center text-uppercase font-mono"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Optional Handover Notes</label>
            <input
              v-model="verificationNotes"
              type="text"
              placeholder="e.g. Handed over 10 meal boxes in insulated bags"
              class="form-input"
            />
          </div>

          <button type="submit" :disabled="submitting" class="btn btn-primary w-full mt-2">
            {{ submitting ? 'Verifying...' : 'Verify Pickup Handover' }}
          </button>
        </form>
      </div>

      <div v-if="errorMessage" class="alert-danger mt-4">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../api/client';

const activeMode = ref<'scanner' | 'manual'>('manual');
const manualCode = ref('');
const verificationNotes = ref('');
const submitting = ref(false);
const errorMessage = ref('');
const successResult = ref<any>(null);

let html5QrScanner: any = null;

async function verifyTokenOrCode(payload: { token?: string; verificationCode?: string; notes?: string }) {
  submitting.value = true;
  errorMessage.value = '';

  try {
    const res = await api.post('/pickups/verify', payload);
    if (res.success && res.data) {
      successResult.value = res.data;
      if (html5QrScanner) {
        html5QrScanner.clear().catch(() => {});
      }
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Verification failed. Code may be invalid or already used.';
  } finally {
    submitting.value = false;
  }
}

async function handleManualSubmit() {
  await verifyTokenOrCode({
    verificationCode: manualCode.value.trim().toUpperCase(),
    notes: verificationNotes.value.trim() || undefined,
  });
}

function onScanSuccess(decodedText: string) {
  try {
    const parsed = JSON.parse(decodedText);
    if (parsed.token) {
      verifyTokenOrCode({ token: parsed.token, notes: 'Scanned via camera QR reader' });
      return;
    }
  } catch {
    // Plain text or token string
    verifyTokenOrCode({ token: decodedText, notes: 'Scanned via camera QR reader' });
  }
}

function startScanner() {
  setTimeout(() => {
    const elem = document.getElementById('qr-reader');
    if (!elem) return;

    html5QrScanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    html5QrScanner.render(onScanSuccess, () => {});
  }, 100);
}

function resetForm() {
  successResult.value = null;
  manualCode.value = '';
  errorMessage.value = '';
}

watch(activeMode, (newVal) => {
  if (newVal === 'scanner') {
    startScanner();
  } else if (html5QrScanner) {
    html5QrScanner.clear().catch(() => {});
  }
});

onMounted(() => {
  if (activeMode.value === 'scanner') {
    startScanner();
  }
});

onUnmounted(() => {
  if (html5QrScanner) {
    html5QrScanner.clear().catch(() => {});
  }
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.verify-card {
  max-width: 580px;
  margin: 0 auto;
  padding: 2.5rem;
}

.icon-header {
  font-size: 2.75rem;
  display: block;
  margin-bottom: 0.5rem;
}

.mode-tabs {
  display: flex;
  background: #f3f4f6;
  border-radius: var(--radius-md);
  padding: 0.25rem;
}

.tab-btn {
  flex: 1;
  padding: 0.65rem;
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: all 0.2s;
}

.tab-btn.active {
  background: #ffffff;
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.qr-reader-box {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.text-uppercase {
  text-transform: uppercase;
}

.font-mono {
  font-family: monospace;
  font-size: 1.25rem;
  letter-spacing: 0.1em;
}

.w-full {
  width: 100%;
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.success-box {
  background: #dcfce7;
  color: #14532d;
  border-radius: var(--radius-lg);
  border: 1px solid #bbf7d0;
}

.success-icon {
  font-size: 3rem;
  display: block;
}
</style>

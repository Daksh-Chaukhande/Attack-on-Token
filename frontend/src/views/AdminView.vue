<template>
  <div class="container py-8">
    <div class="header-row mb-6">
      <div>
        <span class="badge badge-cancelled mb-1">Administrative Center</span>
        <h1>Platform Administration</h1>
        <p class="text-muted">Monitor users, moderation reports, audit trails, and platform metrics.</p>
      </div>
    </div>

    <!-- Overview Metrics -->
    <div class="metrics-grid mb-8" v-if="overview">
      <div class="card metric-card">
        <span class="m-label">Total Users</span>
        <span class="m-val">{{ overview.users?.total || 0 }}</span>
        <span class="text-sm text-muted">Donors: {{ overview.users?.donors }} • Volunteers: {{ overview.users?.volunteers }}</span>
      </div>
      <div class="card metric-card">
        <span class="m-label">Total Listings</span>
        <span class="m-val">{{ overview.listings?.total || 0 }}</span>
        <span class="text-sm text-muted">Active: {{ overview.listings?.active }}</span>
      </div>
      <div class="card metric-card">
        <span class="m-label">Redistributed Claims</span>
        <span class="m-val">{{ overview.claims?.total || 0 }}</span>
        <span class="text-sm text-muted">Completed: {{ overview.claims?.completed }}</span>
      </div>
      <div class="card metric-card">
        <span class="m-label">Pending Reports</span>
        <span class="m-val text-warning">{{ overview.reports?.pending || 0 }}</span>
        <span class="text-sm text-muted">Total Filed: {{ overview.reports?.total }}</span>
      </div>
    </div>

    <!-- Tabs: Users / Reports / Audit Logs -->
    <div class="admin-tabs mb-6">
      <button :class="['tab-btn', { active: currentTab === 'users' }]" @click="currentTab = 'users'">
        👥 User Accounts
      </button>
      <button :class="['tab-btn', { active: currentTab === 'reports' }]" @click="currentTab = 'reports'">
        🚩 Listing Reports
      </button>
      <button :class="['tab-btn', { active: currentTab === 'audit' }]" @click="currentTab = 'audit'">
        📜 Audit Logs
      </button>
    </div>

    <!-- Users Table -->
    <div v-if="currentTab === 'users'" class="card table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="font-bold">{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td><span class="role-tag">{{ u.role }}</span></td>
            <td>
              <span :class="['badge', u.status === 'ACTIVE' ? 'badge-available' : 'badge-expired']">
                {{ u.status }}
              </span>
            </td>
            <td class="text-sm">{{ formatDate(u.createdAt) }}</td>
            <td>
              <button
                v-if="u.role !== 'ADMIN'"
                @click="toggleUserStatus(u)"
                class="btn btn-sm btn-outline"
              >
                {{ u.status === 'ACTIVE' ? 'Suspend' : 'Activate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Reports Table -->
    <div v-else-if="currentTab === 'reports'" class="card table-card">
      <div v-if="reports.length === 0" class="p-8 text-center text-muted">
        No moderation reports filed.
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Listing ID</th>
            <th>Reason</th>
            <th>Details</th>
            <th>Status</th>
            <th>Filed</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td>
              <router-link :to="`/listings/${r.listingId}`" class="font-mono text-sm">
                {{ r.listingId.slice(0, 8) }}...
              </router-link>
            </td>
            <td class="font-bold">{{ r.reason }}</td>
            <td class="text-sm max-w-xs">{{ r.details }}</td>
            <td>
              <span :class="['badge', `badge-${r.status.toLowerCase()}`]">{{ r.status }}</span>
            </td>
            <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
            <td>
              <button
                v-if="r.status === 'PENDING'"
                @click="resolveReport(r.id, 'REVIEWED')"
                class="btn btn-sm btn-primary"
              >
                Mark Reviewed
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Audit Logs Table -->
    <div v-else class="card table-card">
      <div v-if="auditLogs.length === 0" class="p-8 text-center text-muted">
        No audit log records found.
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Entity Type</th>
            <th>Entity ID</th>
            <th>Actor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in auditLogs" :key="log.id">
            <td class="text-sm">{{ formatDateTime(log.createdAt) }}</td>
            <td class="font-mono font-bold text-primary">{{ log.action }}</td>
            <td>{{ log.entityType }}</td>
            <td class="font-mono text-sm">{{ log.entityId?.slice(0, 8) || 'N/A' }}</td>
            <td>{{ log.user?.name || log.userId?.slice(0, 8) || 'System' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client';

const currentTab = ref<'users' | 'reports' | 'audit'>('users');
const overview = ref<any>(null);
const users = ref<any[]>([]);
const reports = ref<any[]>([]);
const auditLogs = ref<any[]>([]);

function formatDate(str?: string) {
  if (!str) return 'N/A';
  return new Date(str).toLocaleDateString();
}

function formatDateTime(str?: string) {
  if (!str) return 'N/A';
  return new Date(str).toLocaleString();
}

async function loadAdminData() {
  try {
    const ov = await api.get('/admin/overview');
    if (ov.success) overview.value = ov.data;

    const u = await api.get('/admin/users');
    if (u.success && u.data.users) users.value = u.data.users;

    const r = await api.get('/reports');
    if (r.success && r.data.reports) reports.value = r.data.reports;

    const a = await api.get('/admin/audit-logs');
    if (a.success && a.data.logs) auditLogs.value = a.data.logs;
  } catch (err) {
    console.error('Failed to load admin data', err);
  }
}

async function toggleUserStatus(u: any) {
  const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  try {
    await api.patch(`/admin/users/${u.id}/status`, { status: newStatus });
    u.status = newStatus;
  } catch (err: any) {
    alert(err.message || 'Failed to update user status');
  }
}

async function resolveReport(reportId: string, status: string) {
  try {
    await api.patch(`/reports/${reportId}`, { status });
    const rep = reports.value.find((r) => r.id === reportId);
    if (rep) rep.status = status;
  } catch (err: any) {
    alert(err.message || 'Failed to resolve report');
  }
}

onMounted(() => {
  loadAdminData();
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.m-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.m-val {
  font-size: 2rem;
  font-weight: 800;
  margin: 0.25rem 0;
}

.admin-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--primary);
  color: #ffffff;
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
  padding: 0.85rem 1.25rem;
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

.role-tag {
  font-size: 0.75rem;
  font-weight: 700;
  background: #f3f4f6;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.font-mono {
  font-family: monospace;
}

.max-w-xs {
  max-width: 250px;
}

.p-8 { padding: 2rem; }
</style>

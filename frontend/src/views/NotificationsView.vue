<template>
  <div class="container py-8">
    <div class="header-row mb-6">
      <div>
        <h1>In-App Notifications</h1>
        <p class="text-muted">Updates about your food claims, pickups, and listing status.</p>
      </div>
      <button v-if="notifications.length > 0" @click="markAllAsRead" class="btn btn-sm btn-outline">
        Mark All Read
      </button>
    </div>

    <div v-if="loading" class="card text-center p-8 text-muted">
      Loading notifications...
    </div>

    <div v-else-if="notifications.length === 0" class="card empty-state text-center p-12">
      <h3>No Notifications Yet</h3>
      <p class="text-muted mt-1">You will receive real-time alerts whenever someone reserves or collects food.</p>
    </div>

    <div v-else class="notifications-list">
      <div
        v-for="item in notifications"
        :key="item.id"
        :class="['card', 'notification-item', { unread: !item.isRead }]"
      >
        <div class="notif-icon">
          <span v-if="item.type === 'CLAIM_CREATED'">🎉</span>
          <span v-else-if="item.type === 'PICKUP_VERIFIED'">✅</span>
          <span v-else-if="item.type === 'CLAIM_CANCELLED'">⚠️</span>
          <span v-else>🔔</span>
        </div>
        <div class="notif-body">
          <div class="notif-header">
            <h4>{{ item.title }}</h4>
            <span class="notif-time">{{ formatTime(item.createdAt) }}</span>
          </div>
          <p class="notif-msg">{{ item.message }}</p>
          <div class="notif-actions mt-2" v-if="item.link">
            <router-link :to="item.link" class="btn btn-sm btn-outline">
              View Activity
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client';

const notifications = ref<any[]>([]);
const loading = ref(true);

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

async function loadNotifications() {
  loading.value = true;
  try {
    const res = await api.get('/notifications');
    if (res.success && res.data.notifications) {
      notifications.value = res.data.notifications;
    }
  } catch (err) {
    console.error('Failed to load notifications', err);
  } finally {
    loading.value = false;
  }
}

async function markAllAsRead() {
  try {
    await api.patch('/notifications/read-all');
    notifications.value.forEach((n) => (n.isRead = true));
  } catch (err) {
    console.error('Failed to mark read', err);
  }
}

onMounted(() => {
  loadNotifications();
});
</script>

<style scoped>
.py-8 {
  padding: 2.5rem 1.25rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notification-item {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  transition: all 0.2s;
}

.notification-item.unread {
  border-left: 4px solid var(--primary);
  background: #f0fdf4;
}

.notif-icon {
  font-size: 1.85rem;
  line-height: 1;
}

.notif-body {
  flex: 1;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.notif-header h4 {
  font-size: 1rem;
  font-weight: 700;
}

.notif-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.notif-msg {
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.5;
}

.p-8 { padding: 2rem; }
.p-12 { padding: 3rem; }
</style>

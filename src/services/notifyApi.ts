import { API_ENDPOINTS, NOTIFY_API_BASE_URL } from '../config/api';
import { AppNotification, NotificationsPage } from '../types/notification';
import { apiRequest } from './apiClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }
  return undefined;
};

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
  }
  return undefined;
};

const parseNotificationData = (
  value: unknown,
): Record<string, string | undefined> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const out: Record<string, string | undefined> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = pickString(entry);
  }
  return out;
};

const parseNotification = (value: unknown): AppNotification | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = pickString(value._id, value.id);
  if (!id) {
    return undefined;
  }
  return {
    id,
    title: pickString(value.title) || 'Notification',
    body: pickString(value.body, value.message) || '',
    type: pickString(value.type) || 'SYSTEM',
    isRead: Boolean(value.isRead ?? value.is_read),
    readAt: pickString(value.readAt, value.read_at) ?? null,
    createdAt: pickString(value.createdAt, value.created_at),
    data: parseNotificationData(value.data),
  };
};

export const formatNotificationTime = (createdAt?: string): string => {
  if (!createdAt) {
    return '';
  }
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) {
    return '';
  }
  const diffMs = Date.now() - ts;
  if (diffMs < 0) {
    return 'Just now';
  }
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(ts).toLocaleDateString();
};

export const notifyApi = {
  async list(token: string, page = 1): Promise<NotificationsPage> {
    const path =
      page > 1
        ? `${API_ENDPOINTS.notifications}?page=${encodeURIComponent(String(page))}`
        : API_ENDPOINTS.notifications;

    const payload = await apiRequest<unknown>(path, {
      method: 'GET',
      token,
      baseUrl: NOTIFY_API_BASE_URL,
    });

    const record = isRecord(payload) ? payload : {};
    const rawList = Array.isArray(record.data)
      ? record.data
      : Array.isArray(payload)
        ? payload
        : [];

    return {
      unreadCount: pickNumber(record.unreadCount, record.unread_count) ?? 0,
      total: pickNumber(record.total) ?? rawList.length,
      page: pickNumber(record.page) ?? page,
      totalPages: pickNumber(record.totalPages, record.total_pages) ?? 1,
      items: rawList
        .map(parseNotification)
        .filter((item): item is AppNotification => Boolean(item)),
    };
  },

  async markRead(token: string, notificationId: string): Promise<void> {
    await apiRequest<unknown>(API_ENDPOINTS.notificationRead(notificationId), {
      method: 'PATCH',
      token,
      baseUrl: NOTIFY_API_BASE_URL,
    });
  },

  async markAllRead(token: string): Promise<void> {
    await apiRequest<unknown>(API_ENDPOINTS.notificationsReadAll, {
      method: 'PATCH',
      token,
      baseUrl: NOTIFY_API_BASE_URL,
    });
  },

  async remove(token: string, notificationId: string): Promise<void> {
    await apiRequest<unknown>(API_ENDPOINTS.notificationDelete(notificationId), {
      method: 'DELETE',
      token,
      baseUrl: NOTIFY_API_BASE_URL,
    });
  },
};

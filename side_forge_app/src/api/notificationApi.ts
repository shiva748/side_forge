import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/api';
import type {
  MarkAllReadResponse,
  NotificationItem,
  NotificationPreferenceResponse,
  UnreadNotificationCountResponse,
  UpdateNotificationPreferencesRequest,
} from '@/types/notification';

export const notificationApi = {
  getMyNotificationPreferences:
    async (): Promise<NotificationPreferenceResponse> => {
      const res = await apiClient.get<NotificationPreferenceResponse>(
        '/api/me/notification-preferences'
      );
      if (!res.data) {
        throw new Error('Unable to load notification preferences.');
      }
      return res.data;
    },

  updateMyNotificationPreferences: async (
    payload: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferenceResponse> => {
    const res = await apiClient.put<NotificationPreferenceResponse>(
      '/api/me/notification-preferences',
      payload
    );
    if (!res.data) {
      throw new Error('Unable to update notification preferences.');
    }
    return res.data;
  },

  getOrganizationNotifications: async (
    organizationId: number,
    page = 0,
    size = 30
  ): Promise<PaginatedResponse<NotificationItem>> => {
    const res = await apiClient.get<PaginatedResponse<NotificationItem>>(
      `/api/organizations/${organizationId}/notifications?page=${page}&size=${size}`,
      { organizationId }
    );
    return (
      res.data ?? {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size,
      }
    );
  },

  getOrganizationUnreadCount: async (
    organizationId: number
  ): Promise<UnreadNotificationCountResponse> => {
    const res = await apiClient.get<UnreadNotificationCountResponse>(
      `/api/organizations/${organizationId}/notifications/unread-count`,
      { organizationId }
    );
    return res.data ?? { organizationId, unreadCount: 0 };
  },

  markOrganizationNotificationRead: async (
    organizationId: number,
    notificationId: number
  ): Promise<NotificationItem | undefined> => {
    const res = await apiClient.patch<NotificationItem>(
      `/api/organizations/${organizationId}/notifications/${notificationId}/read`,
      undefined,
      { organizationId }
    );
    return res.data;
  },

  markAllOrganizationNotificationsRead: async (
    organizationId: number
  ): Promise<MarkAllReadResponse> => {
    const res = await apiClient.patch<MarkAllReadResponse>(
      `/api/organizations/${organizationId}/notifications/read-all`,
      undefined,
      { organizationId }
    );
    return res.data ?? { organizationId, markedReadCount: 0 };
  },
};

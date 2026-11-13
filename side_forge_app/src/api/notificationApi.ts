import { apiClient, ApiClientError } from './client';
import type { PaginatedResponse } from '@/types/api';
import type {
  DeviceInstallationResponse,
  MarkAllReadResponse,
  NotificationItem,
  NotificationPreferenceResponse,
  OrganizationNotificationsQueryParams,
  RegisterDeviceInstallationRequest,
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

  getOrganizationNotificationPreferences: async (
    organizationId: number
  ): Promise<NotificationPreferenceResponse> => {
    const res = await apiClient.get<NotificationPreferenceResponse>(
      `/api/organizations/${organizationId}/notification-preferences`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load school notification preferences.');
    }
    return res.data;
  },

  updateOrganizationNotificationPreferences: async (
    organizationId: number,
    payload: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferenceResponse> => {
    const res = await apiClient.put<NotificationPreferenceResponse>(
      `/api/organizations/${organizationId}/notification-preferences`,
      payload,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to update school notification preferences.');
    }
    return res.data;
  },

  getOrganizationNotifications: async (
    organizationId: number,
    pageOrParams: number | OrganizationNotificationsQueryParams = 0,
    sizeArg = 20
  ): Promise<PaginatedResponse<NotificationItem>> => {
    const params: OrganizationNotificationsQueryParams =
      typeof pageOrParams === 'number'
        ? { page: pageOrParams, size: sizeArg }
        : pageOrParams;

    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const queryParts: string[] = [
      `page=${encodeURIComponent(String(page))}`,
      `size=${encodeURIComponent(String(size))}`,
    ];
    if (params.category) {
      queryParts.push(`category=${encodeURIComponent(params.category)}`);
    }
    if (params.type) {
      queryParts.push(`type=${encodeURIComponent(params.type)}`);
    }
    if (typeof params.unreadOnly === 'boolean') {
      queryParts.push(`unreadOnly=${String(params.unreadOnly)}`);
    }

    const res = await apiClient.get<PaginatedResponse<NotificationItem>>(
      `/api/organizations/${organizationId}/notifications?${queryParts.join(
        '&'
      )}`,
      { organizationId }
    );
    return (
      res.data ?? {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        number: 0,
        size,
        first: true,
        last: true,
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

  registerDeviceInstallation: async (
    payload: RegisterDeviceInstallationRequest
  ): Promise<DeviceInstallationResponse | null> => {
    try {
      const res = await apiClient.post<DeviceInstallationResponse>(
        '/api/me/device-installations',
        payload
      );
      return res.data ?? null;
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.status === 404 || err.status === 405 || err.status === 501)
      ) {
        return null;
      }
      throw err;
    }
  },

  deactivateDeviceInstallation: async (
    installationId: string
  ): Promise<void> => {
    try {
      await apiClient.delete<void>(
        `/api/me/device-installations/${encodeURIComponent(installationId)}`
      );
    } catch {
      // Ignore network or 404 errors during logout cleanup
    }
  },

  acknowledgeNotificationDelivery: async (
    notificationId: number,
    installationId: string,
    channel: 'WEBSOCKET' | 'FCM' | 'APNS'
  ): Promise<void> => {
    try {
      await apiClient.post<void>(
        `/api/me/notifications/${notificationId}/delivery-ack`,
        { installationId, channel }
      );
    } catch {
      // Non-blocking delivery telemetry
    }
  },
};

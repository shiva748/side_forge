/**
 * Notification types aligned with `com.side.forge.notification.dto.NotificationDtos`.
 */

export type NotificationCategory =
  | 'ACADEMIC'
  | 'ATTENDANCE'
  | 'HOMEWORK'
  | 'EXAM'
  | 'FEES'
  | 'ANNOUNCEMENT'
  | 'INVITATION'
  | 'SYSTEM';

export type NotificationDeliveryChannel = 'IN_APP' | 'EMAIL' | 'SMS';

export interface NotificationItem {
  id: number;
  organizationId: number | null;
  recipientUserId: number;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: number | null;
  navigationUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadNotificationCountResponse {
  organizationId: number | null;
  unreadCount: number;
}

export interface MarkAllReadResponse {
  organizationId: number | null;
  markedReadCount: number;
}

export interface CategoryPreferenceState {
  category: NotificationCategory;
  enabled: boolean;
  enabledChannels: NotificationDeliveryChannel[];
  updatedAt?: string | null;
}

export interface NotificationPreferenceResponse {
  userId: number;
  organizationId: number | null;
  preferences: CategoryPreferenceState[];
}

export interface CategoryPreferenceItem {
  category: NotificationCategory;
  enabled: boolean;
  channels?: NotificationDeliveryChannel[];
}

export interface UpdateNotificationPreferencesRequest {
  preferences: CategoryPreferenceItem[];
}


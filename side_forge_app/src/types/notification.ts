/**
 * Notification types aligned with `com.side.forge.notification.dto.NotificationDtos`.
 */

export type NotificationCategory =
  | 'INVITATION'
  | 'HOMEWORK'
  | 'ATTENDANCE'
  | 'EXAMINATION'
  | 'FEES'
  | 'ANNOUNCEMENT'
  | 'TIMETABLE'
  | 'ACADEMIC'
  | 'EXAM'
  | 'SYSTEM';

export type NotificationType =
  | 'INVITATION_RECEIVED'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REVOKED'
  | 'MEMBERSHIP_ROLE_ASSIGNED'
  | 'MEMBERSHIP_ROLE_REVOKED'
  | 'MEMBERSHIP_STATUS_CHANGED'
  | 'HOMEWORK_ASSIGNED'
  | 'HOMEWORK_SUBMISSION_RECEIVED'
  | 'HOMEWORK_EVALUATED'
  | 'STUDENT_MARKED_ABSENT'
  | 'STUDENT_ATTENDANCE_UPDATED'
  | 'EXAM_SCHEDULE_PUBLISHED'
  | 'EXAM_RESULTS_PUBLISHED'
  | 'FEE_DEMAND_GENERATED'
  | 'FEE_PAYMENT_RECORDED'
  | 'FEE_RECEIPT_AVAILABLE'
  | 'FEE_PAYMENT_REVERSED_OR_REFUNDED'
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'TIMETABLE_PUBLISHED'
  | string;

export type NotificationDeliveryChannel =
  | 'IN_APP'
  | 'WEBSOCKET'
  | 'PUSH'
  | 'FCM'
  | 'APNS'
  | 'EMAIL'
  | 'SMS';

export type DevicePlatform = 'ANDROID' | 'IOS' | 'WEB';

export type PushTokenProvider = 'FCM' | 'APNS' | 'EXPO' | 'NONE';

export type DevicePushPermissionStatus =
  | 'GRANTED'
  | 'DENIED'
  | 'UNDETERMINED'
  | 'UNSUPPORTED';

export interface RegisterDeviceInstallationRequest {
  installationId: string;
  platform: DevicePlatform;
  pushProvider: PushTokenProvider;
  nativePushToken?: string | null;
  expoPushToken?: string | null;
  pushPermissionStatus: DevicePushPermissionStatus;
  activeOrganizationId?: number | null;
  appVersion?: string | null;
  deviceName?: string | null;
  osVersion?: string | null;
}

export interface DeviceInstallationResponse {
  id: number;
  userId: number;
  installationId: string;
  platform: DevicePlatform;
  pushProvider: PushTokenProvider;
  pushPermissionStatus: DevicePushPermissionStatus;
  pushTokenRegistered: boolean;
  activeOrganizationId?: number | null;
  active: boolean;
  lastSeenAt: string;
  updatedAt?: string | null;
}

export interface RealtimeNotificationInboundFrame {
  type: 'NOTIFICATION' | 'UNREAD_COUNT' | 'PRESENCE_ACK' | 'PONG' | 'ERROR';
  notification?: NotificationItem;
  organizationId?: number | null;
  unreadCount?: number;
  installationId?: string;
  timestamp?: string;
  message?: string;
}

export interface RealtimeNotificationOutboundFrame {
  type:
    | 'PRESENCE_ACTIVE'
    | 'PRESENCE_INACTIVE'
    | 'HEARTBEAT'
    | 'DELIVERY_ACK';
  installationId: string;
  organizationId?: number | null;
  notificationId?: number | null;
  platform: DevicePlatform;
}

export interface OrganizationNotificationsQueryParams {
  category?: NotificationCategory | null;
  type?: string | null;
  unreadOnly?: boolean | null;
  page?: number;
  size?: number;
}

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


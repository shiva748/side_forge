import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { ENV, STORAGE_KEYS } from '@/constants/env';
import { secureStorage } from '@/utils/secureStorage';
import { notificationApi } from '@/api/notificationApi';
import type {
  DevicePlatform,
  PushTokenProvider,
  RegisterDeviceInstallationRequest,
} from '@/types/notification';

const processedNotificationIds = new Set<number>();
const MAX_TRACKED_NOTIFICATION_IDS = 300;
let lastTappedNotificationKey: string | null = null;

export function hasNotificationBeenProcessedClientSide(
  notificationId?: number | null
): boolean {
  if (!notificationId || notificationId <= 0) return false;
  return processedNotificationIds.has(notificationId);
}

export function markNotificationDeliveredClientSide(
  notificationId?: number | null
): boolean {
  if (!notificationId || notificationId <= 0) return false;
  if (processedNotificationIds.has(notificationId)) {
    return false;
  }
  if (processedNotificationIds.size >= MAX_TRACKED_NOTIFICATION_IDS) {
    const oldest = processedNotificationIds.values().next().value;
    if (typeof oldest === 'number') {
      processedNotificationIds.delete(oldest);
    }
  }
  processedNotificationIds.add(notificationId);
  return true;
}

export function shouldProcessNotificationTap(
  notificationId?: number | null,
  fallbackIdentifier?: string | null
): boolean {
  const key =
    notificationId && notificationId > 0
      ? `id:${notificationId}`
      : fallbackIdentifier
      ? `ident:${fallbackIdentifier}`
      : null;
  if (!key) return true;
  if (lastTappedNotificationKey === key) {
    return false;
  }
  lastTappedNotificationKey = key;
  return true;
}

export function resolveCurrentDevicePlatform(): DevicePlatform {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return 'WEB';
}

function generateInstallationUuid(): string {
  const randomHex = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `sf-${resolveCurrentDevicePlatform().toLowerCase()}-${Date.now().toString(
    36
  )}-${randomHex()}${randomHex()}-${randomHex()}-${randomHex()}`;
}

export async function getOrCreateInstallationId(): Promise<string> {
  const existing = await secureStorage.getAsync(STORAGE_KEYS.INSTALLATION_ID);
  if (existing && existing.trim().length >= 8) {
    return existing.trim();
  }
  const created = generateInstallationUuid();
  await secureStorage.setAsync(STORAGE_KEYS.INSTALLATION_ID, created);
  return created;
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const isLocalRealtimeBanner = data?._localRealtimeBanner === true;
      const rawId = Number(data?.notificationId ?? data?.id ?? 0);
      if (
        !isLocalRealtimeBanner &&
        rawId > 0 &&
        hasNotificationBeenProcessedClientSide(rawId)
      ) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      if (rawId > 0) {
        markNotificationDeliveredClientSide(rawId);
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

let androidChannelConfigured = false;

export async function ensureAndroidNotificationChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelConfigured) {
    return;
  }
  await Notifications.setNotificationChannelAsync(
    ENV.ANDROID_NOTIFICATION_CHANNEL_ID,
    {
      name: 'School Updates & Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 200, 150, 200],
      lightColor: '#3730A3',
      enableVibrate: true,
      showBadge: true,
    }
  );
  androidChannelConfigured = true;
}

/**
 * Triggers a native OS heads-up system notification banner on Android/iOS
 * when a notification arrives over the real-time WebSocket channel.
 */
export async function presentRealtimeOsNotificationBanner(notification: {
  id: number;
  organizationId?: number | null;
  category?: string | null;
  type?: string | null;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: number | null;
  navigationUrl?: string | null;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ensureAndroidNotificationChannelAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title || 'Side Forge Alert',
        body: notification.message || 'You have a new update.',
        sound: 'default',
        data: {
          notificationId: notification.id,
          id: notification.id,
          organizationId: notification.organizationId ?? null,
          category: notification.category ?? null,
          type: notification.type ?? null,
          resourceType: notification.resourceType ?? null,
          resourceId: notification.resourceId ?? null,
          navigationUrl: notification.navigationUrl ?? null,
          _localRealtimeBanner: true,
        },
        ...(Platform.OS === 'android'
          ? { channelId: ENV.ANDROID_NOTIFICATION_CHANNEL_ID }
          : {}),
      },
      trigger: null,
    });
  } catch {
    // Ignore if OS notification permission was revoked
  }
}


export interface PushRegistrationResult {
  granted: boolean;
  installationId: string;
  platform: DevicePlatform;
  tokenProvider: PushTokenProvider;
  nativePushToken: string | null;
  expoPushToken: string | null;
  reason?: string;
}

export async function registerForPushNotificationsAsync(options?: {
  promptIfUndetermined?: boolean;
}): Promise<PushRegistrationResult> {
  const installationId = await getOrCreateInstallationId();
  const platform = resolveCurrentDevicePlatform();
  const promptIfUndetermined = options?.promptIfUndetermined ?? true;

  if (Platform.OS === 'android') {
    await ensureAndroidNotificationChannelAsync().catch(() => {});
  }

  if (Platform.OS === 'web' || !Device.isDevice) {
    return {
      granted: false,
      installationId,
      platform,
      tokenProvider: 'NONE',
      nativePushToken: null,
      expoPushToken: null,
      reason: 'Push notifications require a physical Android or iOS device.',
    };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted' && promptIfUndetermined) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return {
      granted: false,
      installationId,
      platform,
      tokenProvider: 'NONE',
      nativePushToken: null,
      expoPushToken: null,
      reason: 'Notification permissions were not granted on this device.',
    };
  }

  let nativePushToken: string | null = null;
  let expoPushToken: string | null = null;
  let lastErrorReason: string | undefined;

  try {
    const deviceTokenResponse = await Notifications.getDevicePushTokenAsync();
    if (
      typeof deviceTokenResponse.data === 'string' &&
      deviceTokenResponse.data.trim().length > 0
    ) {
      nativePushToken = deviceTokenResponse.data.trim();
    }
  } catch (err) {
    lastErrorReason =
      err instanceof Error
        ? err.message
        : 'Native FCM/APNs token unavailable on this build.';
  }

  try {
    const easProjectId =
      (
        Constants.expoConfig?.extra as
          | { eas?: { projectId?: string } }
          | undefined
      )?.eas?.projectId ?? Constants.easConfig?.projectId;
    const expoTokenResponse = await Notifications.getExpoPushTokenAsync(
      easProjectId ? { projectId: easProjectId } : undefined
    );
    if (
      typeof expoTokenResponse.data === 'string' &&
      expoTokenResponse.data.trim().length > 0
    ) {
      expoPushToken = expoTokenResponse.data.trim();
    }
  } catch (err) {
    if (!lastErrorReason && err instanceof Error) {
      lastErrorReason = err.message;
    }
  }

  const tokenProvider: PushTokenProvider =
    Platform.OS === 'android'
      ? 'FCM'
      : Platform.OS === 'ios'
      ? 'APNS'
      : 'NONE';

  return {
    granted: true,
    installationId,
    platform,
    tokenProvider:
      !nativePushToken && expoPushToken ? 'EXPO' : tokenProvider,
    nativePushToken,
    expoPushToken: expoPushToken ?? nativePushToken,
    ...(nativePushToken || expoPushToken ? {} : { reason: lastErrorReason }),
  };
}

export async function syncDeviceInstallationWithBackend(options?: {
  activeOrganizationId?: number | null;
  promptPermission?: boolean;
}): Promise<PushRegistrationResult> {
  const reg = await registerForPushNotificationsAsync({
    promptIfUndetermined: options?.promptPermission ?? false,
  });

  const payload: RegisterDeviceInstallationRequest = {
    installationId: reg.installationId,
    platform: reg.platform,
    pushProvider: reg.tokenProvider,
    nativePushToken: reg.nativePushToken,
    expoPushToken: reg.expoPushToken,
    pushPermissionStatus: reg.granted ? 'GRANTED' : 'DENIED',
    activeOrganizationId: options?.activeOrganizationId ?? null,
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    deviceName: Device.modelName ?? null,
    osVersion: Device.osVersion ?? null,
  };

  await notificationApi.registerDeviceInstallation(payload).catch(() => null);
  return reg;
}

export async function deactivateCurrentDeviceInstallationOnLogout(): Promise<void> {
  const installationId = await secureStorage.getAsync(
    STORAGE_KEYS.INSTALLATION_ID
  );
  if (!installationId) return;
  await notificationApi.deactivateDeviceInstallation(installationId);
}

/**
 * Extracts an invitation token from either a full URL, deep link
 * (`sideforge://invitations/accept?token=...`), or raw token string.
 */
export function extractInvitationTokenFromInput(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  try {
    const parsed = Linking.parse(trimmed);
    const tokenParam = parsed.queryParams?.token;
    if (typeof tokenParam === 'string' && tokenParam.trim().length > 0) {
      return tokenParam.trim();
    }
  } catch {
    // Fallback to regex parsing below
  }

  const tokenMatch = trimmed.match(/[?&]token=([^&#\s]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    return decodeURIComponent(tokenMatch[1]);
  }

  // If user pasted a raw token without URL wrapper
  if (!trimmed.includes('/') && !trimmed.includes(' ') && trimmed.length >= 12) {
    return trimmed;
  }

  return null;
}

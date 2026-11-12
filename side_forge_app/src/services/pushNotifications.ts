import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

/**
 * Configure foreground notification presentation so school alerts, attendance
 * updates, and announcements surface cleanly while the app is open.
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface PushRegistrationResult {
  granted: boolean;
  expoPushToken: string | null;
  reason?: string;
}

/**
 * Requests OS notification permissions and retrieves the Expo Push Token
 * on physical Android/iOS devices.
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sideforge-default', {
      name: 'School Updates & Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 200, 150, 200],
      lightColor: '#3730A3',
    });
  }

  if (!Device.isDevice) {
    return {
      granted: false,
      expoPushToken: null,
      reason: 'Push notifications require a physical Android or iOS device.',
    };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return {
      granted: false,
      expoPushToken: null,
      reason: 'Notification permissions were not granted.',
    };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    return {
      granted: true,
      expoPushToken: tokenResponse.data,
    };
  } catch (err) {
    return {
      granted: true,
      expoPushToken: null,
      reason:
        err instanceof Error
          ? err.message
          : 'Could not retrieve Expo push token in current environment.',
    };
  }
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

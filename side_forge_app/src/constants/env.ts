import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AppEnvironment = 'development' | 'staging' | 'production';

/**
 * Resolves the default development API base URL when `EXPO_PUBLIC_API_BASE_URL`
 * is not explicitly set:
 * - On Web: returns `''` (same-origin `/api/*` proxied by Metro to `localhost:8080`).
 * - On Expo Go / Metro Dev Server (physical Android/iOS device or emulator):
 *   uses `http://<metroHostUri>` (e.g. `http://10.229.79.151:8081`) which proxies
 *   `/api/*` requests directly to the Spring Boot backend on `localhost:8080`.
 * - Fallback: `http://10.0.2.2:8080` on Android emulator, `http://localhost:8080` on iOS.
 */
function resolveDefaultDevBaseUrl(): string {
  if (Platform.OS === 'web') {
    return '';
  }
  const metroHostUri = Constants.expoConfig?.hostUri;
  if (metroHostUri && metroHostUri.trim().length > 0) {
    return `http://${metroHostUri.trim()}`;
  }
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8080'
    : 'http://localhost:8080';
}

const DEFAULT_DEV_BASE_URL = resolveDefaultDevBaseUrl();

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '');
}

export const ENV = {
  APP_NAME: 'Side Forge',
  APP_ENV: ((process.env.EXPO_PUBLIC_APP_ENV as AppEnvironment) ||
    'development') as AppEnvironment,
  DEFAULT_API_BASE_URL: normalizeBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_DEV_BASE_URL
  ),
  DEEP_LINK_SCHEME: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME || 'sideforge',
  REQUEST_TIMEOUT_MS: 12000,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sideforge.mobile.accessToken',
  THEME_PREFERENCE: 'sideforge.mobile.themePreference',
  ACTIVE_ORG_ID: 'sideforge.mobile.activeOrganizationId',
  ACTIVE_ROLE_EXPERIENCE: 'sideforge.mobile.activeRoleExperience',
  CUSTOM_API_BASE_URL: 'sideforge.mobile.customApiBaseUrl',
  PENDING_INVITATION_TOKEN: 'sideforge.mobile.pendingInvitationToken',
} as const;


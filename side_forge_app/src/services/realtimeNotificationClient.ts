import { AppState, type AppStateStatus } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { ENV, STORAGE_KEYS } from '@/constants/env';
import { getActiveApiBaseUrl } from '@/api/client';
import { notificationApi } from '@/api/notificationApi';
import { queryKeys } from '@/api/queryKeys';
import { secureStorage } from '@/utils/secureStorage';
import {
  getOrCreateInstallationId,
  markNotificationDeliveredClientSide,
  presentRealtimeOsNotificationBanner,
  resolveCurrentDevicePlatform,
} from './pushNotifications';
import type { MobileRoleExperience } from '@/types/auth';
import type {
  RealtimeNotificationInboundFrame,
  RealtimeNotificationOutboundFrame,
} from '@/types/notification';

function buildWebSocketEndpointUrl(
  installationId: string,
  organizationId: number | null
): string {
  const token = secureStorage.getSync(STORAGE_KEYS.ACCESS_TOKEN) || '';
  const platform = resolveCurrentDevicePlatform();

  let wsBase = ENV.WS_NOTIFICATIONS_URL;
  if (!wsBase) {
    const httpBase = getActiveApiBaseUrl();
    if (!httpBase) {
      const loc =
        typeof window !== 'undefined' ? window.location : null;
      const proto = loc?.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = loc?.host || 'localhost:8080';
      wsBase = `${proto}//${host}/ws/notifications`;
    } else {
      const converted = httpBase
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://');
      wsBase = `${converted}/ws/notifications`;
    }
  }

  const queryParts: string[] = [
    `installationId=${encodeURIComponent(installationId)}`,
    `platform=${encodeURIComponent(platform)}`,
  ];
  if (organizationId && organizationId > 0) {
    queryParts.push(`organizationId=${encodeURIComponent(String(organizationId))}`);
  }
  if (token) {
    queryParts.push(`token=${encodeURIComponent(token)}`);
  }

  const sep = wsBase.includes('?') ? '&' : '?';
  return `${wsBase}${sep}${queryParts.join('&')}`;
}

class RealtimeNotificationClient {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private queryClient: QueryClient | null = null;
  private organizationId: number | null = null;
  private experience: MobileRoleExperience = 'PARENT';
  private installationId: string | null = null;
  private active = false;
  private appInForeground = true;
  private reconnectAttempts = 0;

  async start(params: {
    queryClient: QueryClient;
    organizationId: number | null;
    experience: MobileRoleExperience;
  }): Promise<void> {
    this.queryClient = params.queryClient;
    this.organizationId = params.organizationId;
    this.experience = params.experience;
    this.active = true;
    this.installationId = await getOrCreateInstallationId();

    this.attachAppStateListener();
    if (this.appInForeground) {
      this.connectSocket();
    }
  }

  updateContext(
    organizationId: number | null,
    experience: MobileRoleExperience
  ): void {
    const changed =
      this.organizationId !== organizationId || this.experience !== experience;
    this.organizationId = organizationId;
    this.experience = experience;

    if (!this.active) return;

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.installationId) {
      this.sendFrame({
        type: 'PRESENCE_ACTIVE',
        installationId: this.installationId,
        organizationId: this.organizationId,
        platform: resolveCurrentDevicePlatform(),
      });
    } else if (changed && this.appInForeground) {
      this.connectSocket();
    }
  }

  stop(sendInactive = true): void {
    this.active = false;
    this.clearTimers();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.closeSocket(sendInactive);
  }

  private attachAppStateListener(): void {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const nowForeground = nextState === 'active';
        if (nowForeground === this.appInForeground) return;
        this.appInForeground = nowForeground;
        if (!this.active) return;

        if (!nowForeground) {
          // Notify backend that app moved to background so FCM/Expo push is tried first,
          // while keeping the socket alive as an instant background fallback if FCM isn't configured yet.
          if (
            this.socket &&
            this.socket.readyState === WebSocket.OPEN &&
            this.installationId
          ) {
            this.sendFrame({
              type: 'PRESENCE_INACTIVE',
              installationId: this.installationId,
              organizationId: this.organizationId,
              platform: resolveCurrentDevicePlatform(),
            });
          }
        } else {
          this.reconnectAttempts = 0;
          if (
            this.socket &&
            this.socket.readyState === WebSocket.OPEN &&
            this.installationId
          ) {
            this.sendFrame({
              type: 'PRESENCE_ACTIVE',
              installationId: this.installationId,
              organizationId: this.organizationId,
              platform: resolveCurrentDevicePlatform(),
            });
          } else {
            this.connectSocket();
          }
          this.syncInboxCaches();
        }
      }
    );
  }

  private connectSocket(): void {
    if (!this.active || !this.installationId) return;
    const token = secureStorage.getSync(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    this.closeSocket(false);

    try {
      const wsUrl = buildWebSocketEndpointUrl(
        this.installationId,
        this.organizationId
      );
      const ws = new WebSocket(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket !== ws) return;
        this.reconnectAttempts = 0;
        if (this.installationId) {
          this.sendFrame({
            type: this.appInForeground
              ? 'PRESENCE_ACTIVE'
              : 'PRESENCE_INACTIVE',
            installationId: this.installationId,
            organizationId: this.organizationId,
            platform: resolveCurrentDevicePlatform(),
          });
        }
        this.startHeartbeat();
        this.syncInboxCaches();
      };

      ws.onmessage = (event) => {
        if (this.socket !== ws) return;
        this.handleInboundRaw(String(event.data ?? ''));
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (this.socket !== ws) return;
        this.socket = null;
        this.stopHeartbeat();
        if (this.active) {
          this.scheduleReconnect();
        }
      };
    } catch {
      if (this.active) {
        this.scheduleReconnect();
      }
    }
  }

  private handleInboundRaw(raw: string): void {
    if (!raw) return;
    try {
      const frame = JSON.parse(raw) as RealtimeNotificationInboundFrame;
      if (frame.type === 'NOTIFICATION' && frame.notification) {
        const notif = frame.notification;
        const isFirstDelivery = markNotificationDeliveredClientSide(notif.id);
        if (this.installationId && notif.id) {
          this.sendFrame({
            type: 'DELIVERY_ACK',
            installationId: this.installationId,
            organizationId: notif.organizationId ?? this.organizationId,
            notificationId: notif.id,
            platform: resolveCurrentDevicePlatform(),
          });
          void notificationApi.acknowledgeNotificationDelivery(
            notif.id,
            this.installationId,
            'WEBSOCKET'
          );
        }
        if (isFirstDelivery) {
          this.syncInboxCaches(notif.organizationId ?? this.organizationId);
          void presentRealtimeOsNotificationBanner(notif);
        }
      } else if (
        frame.type === 'UNREAD_COUNT' &&
        typeof frame.unreadCount === 'number'
      ) {
        const targetOrgId = frame.organizationId ?? this.organizationId;
        if (this.queryClient && targetOrgId && targetOrgId > 0) {
          this.queryClient.setQueryData(
            queryKeys.notifications.orgUnread(targetOrgId, this.experience),
            {
              organizationId: targetOrgId,
              unreadCount: frame.unreadCount,
            }
          );
        }
      }
    } catch {
      // Ignore malformed frame
    }
  }

  private syncInboxCaches(overrideOrgId?: number | null): void {
    const orgId = overrideOrgId ?? this.organizationId;
    if (!this.queryClient || !orgId || orgId <= 0) return;

    void this.queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.orgUnread(orgId, this.experience),
    });
    void this.queryClient.invalidateQueries({
      queryKey: ['org', orgId, this.experience, 'notifications'],
    });
    if (this.experience === 'PARENT') {
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.parentPortal.dashboard(orgId),
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (
        !this.active ||
        !this.installationId ||
        !this.socket ||
        this.socket.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      this.sendFrame({
        type: 'HEARTBEAT',
        installationId: this.installationId,
        organizationId: this.organizationId,
        platform: resolveCurrentDevicePlatform(),
      });
    }, ENV.WS_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.active) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(
      ENV.WS_RECONNECT_BASE_DELAY_MS *
        Math.pow(1.6, this.reconnectAttempts - 1),
      30000
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectSocket();
    }, delay);
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private sendFrame(frame: RealtimeNotificationOutboundFrame): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(frame));
    } catch {
      // Ignore
    }
  }

  private closeSocket(sendInactive: boolean): void {
    if (!this.socket) return;
    const ws = this.socket;
    this.socket = null;
    if (
      sendInactive &&
      this.installationId &&
      ws.readyState === WebSocket.OPEN
    ) {
      try {
        const frame: RealtimeNotificationOutboundFrame = {
          type: 'PRESENCE_INACTIVE',
          installationId: this.installationId,
          organizationId: this.organizationId,
          platform: resolveCurrentDevicePlatform(),
        };
        ws.send(JSON.stringify(frame));
      } catch {
        // Ignore
      }
    }
    try {
      ws.close();
    } catch {
      // Ignore
    }
  }
}

export const realtimeNotificationClient = new RealtimeNotificationClient();



const WEB_INSTALLATION_STORAGE_KEY = 'sideforge.web.installationId';
const HEARTBEAT_INTERVAL_MS = 20_000;
const RECONNECT_BASE_DELAY_MS = 3_000;

export interface WebRealtimeNotificationPayload {
  id: number;
  organizationId: number | null;
  category: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: number | null;
  navigationUrl?: string | null;
  read: boolean;
  createdAt: string;
}

export interface WebRealtimeInboundFrame {
  type: 'NOTIFICATION' | 'UNREAD_COUNT' | 'PRESENCE_ACK' | 'PONG' | 'ERROR';
  notification?: WebRealtimeNotificationPayload;
  organizationId?: number | null;
  unreadCount?: number;
}

type RealtimeListener = (frame: WebRealtimeInboundFrame) => void;

function getOrCreateWebInstallationId(): string {
  try {
    const existing = window.localStorage.getItem(WEB_INSTALLATION_STORAGE_KEY);
    if (existing && existing.trim().length >= 8) {
      return existing.trim();
    }
    const created = `sf-web-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    window.localStorage.setItem(WEB_INSTALLATION_STORAGE_KEY, created);
    return created;
  } catch {
    return `sf-web-session-${Date.now().toString(36)}`;
  }
}

class WebRealtimeNotificationManager {
  private socket: WebSocket | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private listeners = new Set<RealtimeListener>();
  private seenNotificationIds = new Set<number>();
  private organizationId: number | null = null;
  private active = false;
  private reconnectAttempts = 0;
  private installationId = getOrCreateWebInstallationId();

  start(organizationId: number | null): void {
    this.organizationId = organizationId;
    this.active = true;
    this.connect();
  }

  updateOrganization(organizationId: number | null): void {
    this.organizationId = organizationId;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'PRESENCE_ACTIVE',
        installationId: this.installationId,
        organizationId: this.organizationId,
        platform: 'WEB',
      });
    }
  }

  stop(): void {
    this.active = false;
    this.clearTimers();
    if (this.socket) {
      const ws = this.socket;
      this.socket = null;
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              type: 'PRESENCE_INACTIVE',
              installationId: this.installationId,
              organizationId: this.organizationId,
              platform: 'WEB',
            })
          );
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

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private connect(): void {
    if (!this.active || typeof window === 'undefined') return;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const query = new URLSearchParams({
        installationId: this.installationId,
        platform: 'WEB',
      });
      if (this.organizationId && this.organizationId > 0) {
        query.set('organizationId', String(this.organizationId));
      }
      const ws = new WebSocket(
        `${proto}//${window.location.host}/ws/notifications?${query.toString()}`
      );
      this.socket = ws;

      ws.onopen = () => {
        if (this.socket !== ws) return;
        this.reconnectAttempts = 0;
        this.send({
          type: 'PRESENCE_ACTIVE',
          installationId: this.installationId,
          organizationId: this.organizationId,
          platform: 'WEB',
        });
        this.startHeartbeat();
      };

      ws.onmessage = (ev) => {
        if (this.socket !== ws) return;
        try {
          const frame = JSON.parse(
            String(ev.data ?? '')
          ) as WebRealtimeInboundFrame;
          if (frame.type === 'NOTIFICATION' && frame.notification) {
            const id = frame.notification.id;
            if (this.seenNotificationIds.has(id)) return;
            if (this.seenNotificationIds.size >= 300) {
              const first = this.seenNotificationIds.values().next().value;
              if (typeof first === 'number') {
                this.seenNotificationIds.delete(first);
              }
            }
            this.seenNotificationIds.add(id);
            this.send({
              type: 'DELIVERY_ACK',
              installationId: this.installationId,
              organizationId:
                frame.notification.organizationId ?? this.organizationId,
              notificationId: id,
              platform: 'WEB',
            });
          }
          this.listeners.forEach((cb) => cb(frame));
        } catch {
          // Ignore
        }
      };

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

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({
        type: 'HEARTBEAT',
        installationId: this.installationId,
        organizationId: this.organizationId,
        platform: 'WEB',
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || !this.active) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(1.6, this.reconnectAttempts - 1),
      30_000
    );
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(payload));
    } catch {
      // Ignore
    }
  }
}

export const webRealtimeNotifications = new WebRealtimeNotificationManager();


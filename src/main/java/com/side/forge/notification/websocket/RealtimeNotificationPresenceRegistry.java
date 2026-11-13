package com.side.forge.notification.websocket;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.side.forge.notification.entity.DevicePlatform;
import com.side.forge.notification.util.NotificationJsonCodec;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class RealtimeNotificationPresenceRegistry {

	@Getter
	public static final class InstallationPresenceSession {
		private final Long userId;
		private final String installationId;
		private final DevicePlatform platform;
		private final WebSocketSession session;
		private volatile Long activeOrganizationId;
		private volatile Instant lastHeartbeatAt;

		public InstallationPresenceSession(
				Long userId,
				String installationId,
				DevicePlatform platform,
				Long activeOrganizationId,
				WebSocketSession session) {
			this.userId = userId;
			this.installationId = installationId;
			this.platform = platform;
			this.activeOrganizationId = activeOrganizationId;
			this.session = session;
			this.lastHeartbeatAt = Instant.now();
		}

		public void refreshHeartbeat(Long organizationId) {
			this.lastHeartbeatAt = Instant.now();
			if (organizationId != null && organizationId > 0) {
				this.activeOrganizationId = organizationId;
			}
		}
	}

	private final Map<String, InstallationPresenceSession> sessionsByKey = new ConcurrentHashMap<>();
	private final Map<String, String> keyBySessionId = new ConcurrentHashMap<>();

	@Value("${forge.notification.ws.presence-ttl-seconds:75}")
	private long presenceTtlSeconds;

	public void registerActivePresence(
			Long userId,
			String installationId,
			DevicePlatform platform,
			Long activeOrganizationId,
			WebSocketSession session) {
		if (userId == null || installationId == null || installationId.isBlank() || session == null) {
			return;
		}
		String normalizedInstallationId = installationId.trim();
		String key = buildCompositeKey(userId, normalizedInstallationId);

		InstallationPresenceSession previous = sessionsByKey.put(
				key,
				new InstallationPresenceSession(
						userId,
						normalizedInstallationId,
						platform != null ? platform : DevicePlatform.ANDROID,
						activeOrganizationId,
						session));
		keyBySessionId.put(session.getId(), key);

		if (previous != null && previous.getSession() != null
				&& !previous.getSession().getId().equals(session.getId())
				&& previous.getSession().isOpen()) {
			try {
				previous.getSession().close();
			} catch (IOException ignored) {
			}
		}
	}

	public void refreshHeartbeat(Long userId, String installationId, Long organizationId, WebSocketSession session) {
		if (userId == null || installationId == null || installationId.isBlank()) {
			return;
		}
		String key = buildCompositeKey(userId, installationId.trim());
		InstallationPresenceSession existing = sessionsByKey.get(key);
		if (existing != null) {
			existing.refreshHeartbeat(organizationId);
		} else if (session != null && session.isOpen()) {
			registerActivePresence(userId, installationId, DevicePlatform.ANDROID, organizationId, session);
		}
	}

	public void markPresenceInactive(Long userId, String installationId) {
		if (userId == null || installationId == null || installationId.isBlank()) {
			return;
		}
		String key = buildCompositeKey(userId, installationId.trim());
		InstallationPresenceSession removed = sessionsByKey.remove(key);
		if (removed != null && removed.getSession() != null) {
			keyBySessionId.remove(removed.getSession().getId());
		}
	}

	public void removeByWebSocketSession(WebSocketSession session) {
		if (session == null) {
			return;
		}
		String key = keyBySessionId.remove(session.getId());
		if (key != null) {
			sessionsByKey.computeIfPresent(key, (k, current) -> {
				if (current.getSession() != null && current.getSession().getId().equals(session.getId())) {
					return null;
				}
				return current;
			});
		}
	}

	public boolean isInstallationActivelyPresent(Long userId, String installationId) {
		if (userId == null || installationId == null || installationId.isBlank()) {
			return false;
		}
		String key = buildCompositeKey(userId, installationId.trim());
		InstallationPresenceSession presence = sessionsByKey.get(key);
		if (presence == null) {
			return false;
		}
		if (!isSessionLeaseValid(presence)) {
			sessionsByKey.remove(key, presence);
			return false;
		}
		return true;
	}

	public List<InstallationPresenceSession> getActiveSessionsForUser(Long userId) {
		if (userId == null) {
			return List.of();
		}
		List<InstallationPresenceSession> active = new ArrayList<>();
		for (Map.Entry<String, InstallationPresenceSession> entry : sessionsByKey.entrySet()) {
			InstallationPresenceSession presence = entry.getValue();
			if (userId.equals(presence.getUserId())) {
				if (isSessionLeaseValid(presence)) {
					active.add(presence);
				} else {
					sessionsByKey.remove(entry.getKey(), presence);
				}
			}
		}
		return active;
	}

	public boolean sendFrameToInstallation(Long userId, String installationId, String jsonFrame) {
		if (userId == null || installationId == null || installationId.isBlank() || jsonFrame == null) {
			return false;
		}
		String key = buildCompositeKey(userId, installationId.trim());
		InstallationPresenceSession presence = sessionsByKey.get(key);
		if (presence == null || !isSessionLeaseValid(presence)) {
			if (presence != null) {
				sessionsByKey.remove(key, presence);
			}
			return false;
		}
		return sendTextSafely(presence.getSession(), jsonFrame);
	}

	public void broadcastUnreadCountToUser(Long userId, Long organizationId, long unreadCount) {
		if (userId == null) {
			return;
		}
		String frame = NotificationJsonCodec.buildWebSocketUnreadCountFrame(organizationId, unreadCount);
		for (InstallationPresenceSession presence : getActiveSessionsForUser(userId)) {
			sendTextSafely(presence.getSession(), frame);
		}
	}

	private boolean isSessionLeaseValid(InstallationPresenceSession presence) {
		WebSocketSession ws = presence.getSession();
		if (ws == null || !ws.isOpen()) {
			return false;
		}
		long ageSeconds = Duration.between(presence.getLastHeartbeatAt(), Instant.now()).getSeconds();
		return ageSeconds <= Math.max(presenceTtlSeconds, 30L);
	}

	private boolean sendTextSafely(WebSocketSession session, String payload) {
		if (session == null || !session.isOpen()) {
			return false;
		}
		try {
			synchronized (session) {
				if (!session.isOpen()) {
					return false;
				}
				session.sendMessage(new TextMessage(payload));
			}
			return true;
		} catch (IOException | IllegalStateException ex) {
			log.debug("WebSocket send failed for session {}: {}", session.getId(), ex.getMessage());
			removeByWebSocketSession(session);
			return false;
		}
	}

	private static String buildCompositeKey(Long userId, String installationId) {
		return userId + "::" + installationId;
	}
}


package com.side.forge.notification.websocket;

import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.side.forge.notification.dto.NotificationDtos.NotificationDeliveryAckRequest;
import com.side.forge.notification.entity.DevicePlatform;
import com.side.forge.notification.entity.InstallationDeliveryChannel;
import com.side.forge.notification.service.NotificationDeviceInstallationService;
import com.side.forge.notification.util.NotificationJsonCodec;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandler extends TextWebSocketHandler {

	private final RealtimeNotificationPresenceRegistry presenceRegistry;
	private final NotificationDeviceInstallationService installationService;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		Map<String, Object> attrs = session.getAttributes();
		Long userId = (Long) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_USER_ID);
		String installationId = (String) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_INSTALLATION_ID);
		DevicePlatform platform = (DevicePlatform) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_PLATFORM);
		Long organizationId = (Long) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_ORGANIZATION_ID);

		if (userId == null || installationId == null) {
			session.close(CloseStatus.POLICY_VIOLATION);
			return;
		}

		presenceRegistry.registerActivePresence(userId, installationId, platform, organizationId, session);
		installationService.touchInstallationPresence(userId, installationId, organizationId);

		String ack = NotificationJsonCodec.buildWebSocketControlFrame("PRESENCE_ACK", organizationId);
		session.sendMessage(new TextMessage(ack));
	}

	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message) {
		Map<String, Object> attrs = session.getAttributes();
		Long userId = (Long) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_USER_ID);
		String defaultInstallationId = (String) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_INSTALLATION_ID);
		DevicePlatform defaultPlatform = (DevicePlatform) attrs.get(NotificationWebSocketHandshakeInterceptor.ATTR_PLATFORM);

		if (userId == null) {
			return;
		}

		String payload = message.getPayload();
		String frameType = NotificationJsonCodec.extractStringField(payload, "type");
		if (frameType == null) {
			return;
		}

		String frameInstId = NotificationJsonCodec.extractStringField(payload, "installationId");
		String installationId = (frameInstId != null && !frameInstId.isBlank())
				? frameInstId.trim()
				: defaultInstallationId;
		Long organizationId = NotificationJsonCodec.extractLongField(payload, "organizationId");

		switch (frameType.toUpperCase(Locale.ROOT)) {
			case "PRESENCE_ACTIVE" -> {
				DevicePlatform platform = defaultPlatform;
				String platformRaw = NotificationJsonCodec.extractStringField(payload, "platform");
				if (platformRaw != null && !platformRaw.isBlank()) {
					try {
						platform = DevicePlatform.valueOf(platformRaw.trim().toUpperCase(Locale.ROOT));
					} catch (IllegalArgumentException ignored) {
					}
				}
				attrs.put(NotificationWebSocketHandshakeInterceptor.ATTR_INSTALLATION_ID, installationId);
				if (organizationId != null && organizationId > 0) {
					attrs.put(NotificationWebSocketHandshakeInterceptor.ATTR_ORGANIZATION_ID, organizationId);
				}
				presenceRegistry.registerActivePresence(userId, installationId, platform, organizationId, session);
				installationService.touchInstallationPresence(userId, installationId, organizationId);
				presenceRegistry.sendFrameToInstallation(
						userId,
						installationId,
						NotificationJsonCodec.buildWebSocketControlFrame("PRESENCE_ACK", organizationId));
			}
			case "HEARTBEAT" -> {
				presenceRegistry.refreshHeartbeat(userId, installationId, organizationId, session);
				installationService.touchInstallationPresence(userId, installationId, organizationId);
				presenceRegistry.sendFrameToInstallation(
						userId,
						installationId,
						NotificationJsonCodec.buildWebSocketControlFrame("PONG", organizationId));
			}
			case "PRESENCE_INACTIVE" -> {
				presenceRegistry.markPresenceInactive(userId, installationId);
			}
			case "DELIVERY_ACK" -> {
				Long notificationId = NotificationJsonCodec.extractLongField(payload, "notificationId");
				if (notificationId != null && notificationId > 0 && installationId != null) {
					installationService.acknowledgeDelivery(
							userId,
							notificationId,
							new NotificationDeliveryAckRequest(installationId, InstallationDeliveryChannel.WEBSOCKET));
				}
			}
			default -> {
				// Ignore unknown frame types
			}
		}
	}

	@Override
	public void handleTransportError(WebSocketSession session, Throwable exception) {
		presenceRegistry.removeByWebSocketSession(session);
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
		presenceRegistry.removeByWebSocketSession(session);
	}
}

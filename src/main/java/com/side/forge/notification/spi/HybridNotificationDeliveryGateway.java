package com.side.forge.notification.spi;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import com.side.forge.notification.entity.DevicePlatform;
import com.side.forge.notification.entity.DevicePushPermissionStatus;
import com.side.forge.notification.entity.InstallationDeliveryChannel;
import com.side.forge.notification.entity.InstallationDeliveryStatus;
import com.side.forge.notification.entity.NotificationDeliveryChannel;
import com.side.forge.notification.entity.NotificationInstallationDelivery;
import com.side.forge.notification.entity.PushProviderType;
import com.side.forge.notification.entity.UserDeviceInstallation;
import com.side.forge.notification.push.ApnsHttp2PushClient;
import com.side.forge.notification.push.FcmHttpV1PushClient;
import com.side.forge.notification.push.PushSendResult;
import com.side.forge.notification.repository.InAppNotificationRepository;
import com.side.forge.notification.repository.NotificationInstallationDeliveryRepository;
import com.side.forge.notification.repository.UserDeviceInstallationRepository;
import com.side.forge.notification.service.NotificationDeviceInstallationService;
import com.side.forge.notification.util.NotificationJsonCodec;
import com.side.forge.notification.websocket.RealtimeNotificationPresenceRegistry;
import com.side.forge.notification.websocket.RealtimeNotificationPresenceRegistry.InstallationPresenceSession;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Primary hybrid notification delivery gateway implementing:
 * 1. Real-time WebSocket delivery for actively connected foreground installations
 *    (with automatic OS push banner suppression for that installation).
 * 2. Native Push Notification fallback (FCM HTTP v1 / APNs HTTP/2) for offline or
 *    backgrounded mobile installations, with per-(notificationId, installationId)
 *    idempotency and automatic invalid token cleanup.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class HybridNotificationDeliveryGateway implements NotificationDeliveryGateway {

	private static final Set<InstallationDeliveryStatus> COMPLETED_DELIVERY_STATUSES = Set.of(
			InstallationDeliveryStatus.SENT,
			InstallationDeliveryStatus.DELIVERED);

	private final RealtimeNotificationPresenceRegistry presenceRegistry;
	private final UserDeviceInstallationRepository installationRepository;
	private final NotificationInstallationDeliveryRepository deliveryRepository;
	private final InAppNotificationRepository notificationRepository;
	private final NotificationDeviceInstallationService installationService;
	private final FcmHttpV1PushClient fcmClient;
	private final ApnsHttp2PushClient apnsClient;

	@Override
	public NotificationDeliveryChannel supportedChannel() {
		return NotificationDeliveryChannel.IN_APP;
	}

	@Override
	public void onNotificationPersisted(NotificationDispatchEvent event) {
		if (event == null || event.notificationId() == null || event.recipientUserId() == null) {
			return;
		}
		Long userId = event.recipientUserId();
		Long orgId = event.organizationId();
		Long notificationId = event.notificationId();

		String notificationFrame = NotificationJsonCodec.buildWebSocketNotificationFrame(event);
		long unreadCount = orgId != null
				? notificationRepository.countByRecipientUserIdAndOrganizationIdAndReadFalse(userId, orgId)
				: notificationRepository.countByRecipientUserIdAndReadFalse(userId);
		String unreadFrame = NotificationJsonCodec.buildWebSocketUnreadCountFrame(orgId, unreadCount);

		Set<String> websocketDeliveredInstallations = new HashSet<>();

		// 1. Deliver in real time to all active foreground WebSocket sessions for this user
		List<InstallationPresenceSession> activeSessions = presenceRegistry.getActiveSessionsForUser(userId);
		for (InstallationPresenceSession session : activeSessions) {
			String installationId = session.getInstallationId();
			if (alreadyDeliveredToInstallation(notificationId, installationId)) {
				websocketDeliveredInstallations.add(installationId);
				continue;
			}
			boolean sent = presenceRegistry.sendFrameToInstallation(userId, installationId, notificationFrame);
			if (sent) {
				presenceRegistry.sendFrameToInstallation(userId, installationId, unreadFrame);
				websocketDeliveredInstallations.add(installationId);
				recordDelivery(
						event,
						installationId,
						InstallationDeliveryChannel.WEBSOCKET,
						InstallationDeliveryStatus.DELIVERED,
						"ws-frame",
						null,
						null);
			}
		}

		// 2. For registered mobile installations not currently active on WebSocket, dispatch push
		boolean pushAllowed = event.enabledChannels() == null
				|| event.enabledChannels().isEmpty()
				|| event.enabledChannels().contains(NotificationDeliveryChannel.PUSH)
				|| event.enabledChannels().contains(NotificationDeliveryChannel.FCM)
				|| event.enabledChannels().contains(NotificationDeliveryChannel.APNS)
				|| event.enabledChannels().contains(NotificationDeliveryChannel.IN_APP);
		if (!pushAllowed) {
			return;
		}

		List<UserDeviceInstallation> activeInstallations = installationRepository
				.findAllByUserIdAndActiveTrueOrderByIdAsc(userId);
		for (UserDeviceInstallation installation : activeInstallations) {
			String installationId = installation.getInstallationId();
			if (websocketDeliveredInstallations.contains(installationId)
					|| presenceRegistry.isInstallationActivelyPresent(userId, installationId)) {
				continue;
			}
			if (alreadyDeliveredToInstallation(notificationId, installationId)) {
				continue;
			}
			dispatchBackgroundPushToInstallation(installation, event);
		}
	}

	private void dispatchBackgroundPushToInstallation(
			UserDeviceInstallation installation, NotificationDispatchEvent event) {
		if (installation.getPlatform() == DevicePlatform.WEB) {
			return;
		}
		if (installation.getPushPermissionStatus() != DevicePushPermissionStatus.GRANTED) {
			return;
		}
		String token = installation.getNativePushToken();
		if (token == null || token.isBlank()) {
			return;
		}

		String installationId = installation.getInstallationId();
		PushProviderType provider = installation.getPushProvider();

		if (provider == PushProviderType.APNS && apnsClient.isConfiguredAndEnabled()) {
			PushSendResult result = apnsClient.sendPushNotification(token, event);
			handlePushResult(event, installationId, InstallationDeliveryChannel.APNS, result);
			return;
		}

		if (fcmClient.isConfiguredAndEnabled()) {
			PushSendResult result = fcmClient.sendPushNotification(token, event);
			handlePushResult(event, installationId, InstallationDeliveryChannel.FCM, result);
		}
	}

	private void handlePushResult(
			NotificationDispatchEvent event,
			String installationId,
			InstallationDeliveryChannel channel,
			PushSendResult result) {
		if (result.delivered()) {
			recordDelivery(
					event,
					installationId,
					channel,
					InstallationDeliveryStatus.SENT,
					result.providerMessageId(),
					null,
					null);
			return;
		}

		recordDelivery(
				event,
				installationId,
				channel,
				InstallationDeliveryStatus.FAILED,
				null,
				result.errorCode(),
				result.errorMessage());

		if (result.permanentTokenFailure()) {
			installationService.invalidateInstallationPushToken(
					installationId, result.errorCode(), result.errorMessage());
		}
	}

	private boolean alreadyDeliveredToInstallation(Long notificationId, String installationId) {
		if (notificationId == null || installationId == null || installationId.isBlank()) {
			return false;
		}
		return deliveryRepository.existsByNotificationIdAndInstallationIdAndStatusIn(
				notificationId, installationId.trim(), COMPLETED_DELIVERY_STATUSES);
	}

	private void recordDelivery(
			NotificationDispatchEvent event,
			String installationId,
			InstallationDeliveryChannel channel,
			InstallationDeliveryStatus status,
			String providerMessageId,
			String errorCode,
			String errorMessage) {
		try {
			NotificationInstallationDelivery record = deliveryRepository
					.findByNotificationIdAndInstallationId(event.notificationId(), installationId)
					.orElseGet(() -> {
						NotificationInstallationDelivery created = new NotificationInstallationDelivery();
						created.setNotificationId(event.notificationId());
						created.setRecipientUserId(event.recipientUserId());
						created.setOrganizationId(event.organizationId());
						created.setInstallationId(installationId);
						return created;
					});
			record.setChannel(channel);
			record.setStatus(status);
			record.setProviderMessageId(providerMessageId);
			record.setErrorCode(errorCode);
			record.setErrorMessage(
					errorMessage != null && errorMessage.length() > 500
							? errorMessage.substring(0, 500)
							: errorMessage);
			if (status == InstallationDeliveryStatus.DELIVERED || status == InstallationDeliveryStatus.SENT) {
				record.setDeliveredAt(Instant.now());
			}
			deliveryRepository.saveAndFlush(record);
		} catch (Exception ex) {
			log.debug("Unable to record delivery status for notification {} installation {}: {}",
					event.notificationId(), installationId, ex.getMessage());
		}
	}
}


package com.side.forge.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.side.forge.notification.dto.NotificationDtos.DeviceInstallationResponse;
import com.side.forge.notification.dto.NotificationDtos.RegisterDeviceInstallationRequest;
import com.side.forge.notification.entity.DevicePlatform;
import com.side.forge.notification.entity.DevicePushPermissionStatus;
import com.side.forge.notification.entity.InstallationDeliveryStatus;
import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationDeliveryChannel;
import com.side.forge.notification.entity.NotificationInstallationDelivery;
import com.side.forge.notification.entity.NotificationType;
import com.side.forge.notification.entity.PushProviderType;
import com.side.forge.notification.entity.UserDeviceInstallation;
import com.side.forge.notification.push.ApnsHttp2PushClient;
import com.side.forge.notification.push.ExpoPushClient;
import com.side.forge.notification.push.FcmHttpV1PushClient;
import com.side.forge.notification.push.PushSendResult;
import com.side.forge.notification.repository.InAppNotificationRepository;
import com.side.forge.notification.repository.NotificationInstallationDeliveryRepository;
import com.side.forge.notification.repository.UserDeviceInstallationRepository;
import com.side.forge.notification.service.NotificationDeviceInstallationService;
import com.side.forge.notification.spi.HybridNotificationDeliveryGateway;
import com.side.forge.notification.spi.NotificationDeliveryGateway.NotificationDispatchEvent;
import com.side.forge.notification.websocket.RealtimeNotificationPresenceRegistry;

class HybridNotificationDeliveryTest {

	private RealtimeNotificationPresenceRegistry presenceRegistry;
	private UserDeviceInstallationRepository installationRepository;
	private NotificationInstallationDeliveryRepository deliveryRepository;
	private InAppNotificationRepository notificationRepository;
	private NotificationDeviceInstallationService installationService;
	private FcmHttpV1PushClient fcmClient;
	private ApnsHttp2PushClient apnsClient;
	private ExpoPushClient expoPushClient;
	private HybridNotificationDeliveryGateway gateway;

	@BeforeEach
	void setUp() {
		presenceRegistry = new RealtimeNotificationPresenceRegistry();
		ReflectionTestUtils.setField(presenceRegistry, "presenceTtlSeconds", 75L);

		installationRepository = mock(UserDeviceInstallationRepository.class);
		deliveryRepository = mock(NotificationInstallationDeliveryRepository.class);
		notificationRepository = mock(InAppNotificationRepository.class);
		installationService = new NotificationDeviceInstallationService(
				installationRepository, deliveryRepository, notificationRepository);
		fcmClient = mock(FcmHttpV1PushClient.class);
		apnsClient = mock(ApnsHttp2PushClient.class);
		expoPushClient = mock(ExpoPushClient.class);

		gateway = new HybridNotificationDeliveryGateway(
				presenceRegistry,
				installationRepository,
				deliveryRepository,
				notificationRepository,
				installationService,
				fcmClient,
				apnsClient,
				expoPushClient);
	}

	@Test
	void activeForegroundWebSocketDeliversInRealTimeAndSuppressesPushBanner() throws Exception {
		Long userId = 42L;
		Long orgId = 7L;
		String installationId = "sf-inst-foreground-1";

		WebSocketSession wsSession = mock(WebSocketSession.class);
		when(wsSession.getId()).thenReturn("ws-session-1");
		when(wsSession.isOpen()).thenReturn(true);

		presenceRegistry.registerActivePresence(
				userId, installationId, DevicePlatform.ANDROID, orgId, wsSession);

		UserDeviceInstallation inst = new UserDeviceInstallation();
		inst.setId(1L);
		inst.setUserId(userId);
		inst.setInstallationId(installationId);
		inst.setPlatform(DevicePlatform.ANDROID);
		inst.setPushProvider(PushProviderType.FCM);
		inst.setPushPermissionStatus(DevicePushPermissionStatus.GRANTED);
		inst.setNativePushToken("fcm-token-active-123");
		inst.setActive(true);

		when(installationRepository.findAllByUserIdAndActiveTrueOrderByIdAsc(userId))
				.thenReturn(List.of(inst));
		when(notificationRepository.countByRecipientUserIdAndOrganizationIdAndReadFalse(userId, orgId))
				.thenReturn(3L);
		when(deliveryRepository.existsByNotificationIdAndInstallationIdAndStatusIn(
				eq(100L), eq(installationId), any()))
				.thenReturn(false);
		when(deliveryRepository.findByNotificationIdAndInstallationId(100L, installationId))
				.thenReturn(Optional.empty());

		NotificationDispatchEvent event = new NotificationDispatchEvent(
				100L,
				orgId,
				userId,
				NotificationCategory.ANNOUNCEMENT,
				NotificationType.ANNOUNCEMENT_PUBLISHED,
				"School Closed Tomorrow",
				"Due to heavy rain, school will remain closed.",
				"ANNOUNCEMENT",
				55L,
				"/organizations/7/announcements/55",
				Set.of(NotificationDeliveryChannel.IN_APP, NotificationDeliveryChannel.PUSH),
				Instant.now());

		gateway.onNotificationPersisted(event);

		// WebSocket receives both NOTIFICATION and UNREAD_COUNT frames
		verify(wsSession, times(2)).sendMessage(any(TextMessage.class));
		// Push client is NOT invoked for the active foreground installation
		verify(fcmClient, never()).sendPushNotification(any(), any());
		verify(deliveryRepository, times(1)).saveAndFlush(any(NotificationInstallationDelivery.class));
	}

	@Test
	void backgroundedInstallationRoutesViaFcmAndInvalidatesTokenOnUnregistered() {
		Long userId = 42L;
		Long orgId = 7L;
		String installationId = "sf-inst-background-2";

		UserDeviceInstallation inst = new UserDeviceInstallation();
		inst.setId(2L);
		inst.setUserId(userId);
		inst.setInstallationId(installationId);
		inst.setPlatform(DevicePlatform.ANDROID);
		inst.setPushProvider(PushProviderType.FCM);
		inst.setPushPermissionStatus(DevicePushPermissionStatus.GRANTED);
		inst.setNativePushToken("stale-fcm-token-999");
		inst.setActive(true);

		when(installationRepository.findAllByUserIdAndActiveTrueOrderByIdAsc(userId))
				.thenReturn(List.of(inst));
		when(installationRepository.findByInstallationId(installationId))
				.thenReturn(Optional.of(inst));
		when(deliveryRepository.existsByNotificationIdAndInstallationIdAndStatusIn(
				eq(101L), eq(installationId), any()))
				.thenReturn(false);
		when(deliveryRepository.findByNotificationIdAndInstallationId(101L, installationId))
				.thenReturn(Optional.empty());
		when(fcmClient.isConfiguredAndEnabled()).thenReturn(true);
		when(fcmClient.sendPushNotification(eq("stale-fcm-token-999"), any()))
				.thenReturn(PushSendResult.failure(true, "UNREGISTERED", "Token is no longer registered"));

		NotificationDispatchEvent event = new NotificationDispatchEvent(
				101L,
				orgId,
				userId,
				NotificationCategory.FEES,
				NotificationType.FEE_PAYMENT_RECORDED,
				"Fee Receipt Generated",
				"Your payment of INR 12,500 has been recorded.",
				"FEE_PAYMENT",
				88L,
				"/organizations/7/fees/88",
				Set.of(NotificationDeliveryChannel.IN_APP, NotificationDeliveryChannel.PUSH),
				Instant.now());

		gateway.onNotificationPersisted(event);

		verify(fcmClient, times(1)).sendPushNotification(eq("stale-fcm-token-999"), eq(event));
		// Stale token was invalidated on the installation entity
		assertEquals(null, inst.getNativePushToken());
		assertNotNull(inst.getInvalidatedAt());
		assertTrue(inst.getInvalidationReason().contains("UNREGISTERED"));
	}

	@Test
	void registerInstallationRebindsUserAndClearsTokenOnLogout() {
		String installationId = "sf-inst-shared-device";
		UserDeviceInstallation existing = new UserDeviceInstallation();
		existing.setId(10L);
		existing.setUserId(100L);
		existing.setInstallationId(installationId);
		existing.setPlatform(DevicePlatform.ANDROID);

		when(installationRepository.findAllByNativePushTokenAndInstallationIdNot("fcm-shared-tok", installationId))
				.thenReturn(List.of());
		when(installationRepository.findByInstallationId(installationId))
				.thenReturn(Optional.of(existing));
		when(installationRepository.saveAndFlush(any(UserDeviceInstallation.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		RegisterDeviceInstallationRequest req = new RegisterDeviceInstallationRequest(
				installationId,
				DevicePlatform.ANDROID,
				PushProviderType.FCM,
				"fcm-shared-tok",
				null,
				DevicePushPermissionStatus.GRANTED,
				5L,
				"1.0.0",
				"Pixel 8",
				"15");

		DeviceInstallationResponse res = installationService.registerOrUpdateInstallation(200L, req);
		assertEquals(200L, res.userId());
		assertTrue(res.pushTokenRegistered());
		assertTrue(res.active());

		when(installationRepository.findByInstallationIdAndUserId(installationId, 200L))
				.thenReturn(Optional.of(existing));
		installationService.deactivateInstallation(200L, installationId);
		assertFalse(existing.isActive());
		assertEquals(null, existing.getNativePushToken());
	}
}


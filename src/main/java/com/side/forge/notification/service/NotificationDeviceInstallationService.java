package com.side.forge.notification.service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.notification.dto.NotificationDtos.DeviceInstallationResponse;
import com.side.forge.notification.dto.NotificationDtos.NotificationDeliveryAckRequest;
import com.side.forge.notification.dto.NotificationDtos.RegisterDeviceInstallationRequest;
import com.side.forge.notification.entity.DevicePushPermissionStatus;
import com.side.forge.notification.entity.InstallationDeliveryChannel;
import com.side.forge.notification.entity.InstallationDeliveryStatus;
import com.side.forge.notification.entity.NotificationInstallationDelivery;
import com.side.forge.notification.entity.PushProviderType;
import com.side.forge.notification.entity.UserDeviceInstallation;
import com.side.forge.notification.repository.InAppNotificationRepository;
import com.side.forge.notification.repository.NotificationInstallationDeliveryRepository;
import com.side.forge.notification.repository.UserDeviceInstallationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDeviceInstallationService {

	private final UserDeviceInstallationRepository installationRepository;
	private final NotificationInstallationDeliveryRepository deliveryRepository;
	private final InAppNotificationRepository notificationRepository;

	@Transactional
	public DeviceInstallationResponse registerOrUpdateInstallation(
			Long userId, RegisterDeviceInstallationRequest request) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		String installationId = request.installationId().trim();
		String normalizedNativeToken = trimToNull(request.nativePushToken());
		String normalizedExpoToken = trimToNull(request.expoPushToken());
		Instant now = Instant.now();

		if (normalizedNativeToken != null) {
			List<UserDeviceInstallation> conflicting = installationRepository
					.findAllByNativePushTokenAndInstallationIdNot(normalizedNativeToken, installationId);
			for (UserDeviceInstallation other : conflicting) {
				other.setNativePushToken(null);
				other.setInvalidatedAt(now);
				other.setInvalidationReason("REASSIGNED_TO_INSTALLATION:" + installationId);
				installationRepository.save(other);
			}
		}

		UserDeviceInstallation installation = installationRepository
				.findByInstallationId(installationId)
				.orElseGet(() -> {
					UserDeviceInstallation created = new UserDeviceInstallation();
					created.setInstallationId(installationId);
					return created;
				});

		boolean tokenChanged = !Objects.equals(installation.getNativePushToken(), normalizedNativeToken)
				|| !Objects.equals(installation.getExpoPushToken(), normalizedExpoToken);

		installation.setUserId(userId);
		installation.setPlatform(request.platform());
		installation.setPushProvider(
				request.pushProvider() != null ? request.pushProvider() : PushProviderType.NONE);
		installation.setPushPermissionStatus(
				request.pushPermissionStatus() != null
						? request.pushPermissionStatus()
						: DevicePushPermissionStatus.UNDETERMINED);

		if (installation.getPushPermissionStatus() == DevicePushPermissionStatus.GRANTED) {
			installation.setNativePushToken(normalizedNativeToken);
			installation.setExpoPushToken(normalizedExpoToken);
			if (tokenChanged && (normalizedNativeToken != null || normalizedExpoToken != null)) {
				installation.setTokenUpdatedAt(now);
			}
			installation.setInvalidatedAt(null);
			installation.setInvalidationReason(null);
		} else {
			installation.setNativePushToken(null);
			installation.setExpoPushToken(null);
		}

		installation.setActiveOrganizationId(request.activeOrganizationId());
		installation.setAppVersion(trimToNull(request.appVersion()));
		installation.setDeviceName(trimToNull(request.deviceName()));
		installation.setOsVersion(trimToNull(request.osVersion()));
		installation.setActive(true);
		installation.setLastSeenAt(now);

		UserDeviceInstallation saved = installationRepository.saveAndFlush(installation);
		return toResponse(saved);
	}

	@Transactional(readOnly = true)
	public List<DeviceInstallationResponse> getActiveInstallationsForUser(Long userId) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		return installationRepository.findAllByUserIdAndActiveTrueOrderByIdAsc(userId)
				.stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public void deactivateInstallation(Long userId, String installationId) {
		if (userId == null || installationId == null || installationId.isBlank()) {
			return;
		}
		installationRepository.findByInstallationIdAndUserId(installationId.trim(), userId)
				.ifPresent(inst -> {
					inst.setActive(false);
					inst.setNativePushToken(null);
					inst.setExpoPushToken(null);
					inst.setLastSeenAt(Instant.now());
					inst.setInvalidatedAt(Instant.now());
					inst.setInvalidationReason("USER_LOGOUT");
					installationRepository.saveAndFlush(inst);
				});
	}

	@Transactional
	public void invalidateInstallationPushToken(String installationId, String errorCode, String errorMessage) {
		if (installationId == null || installationId.isBlank()) {
			return;
		}
		installationRepository.findByInstallationId(installationId.trim())
				.ifPresent(inst -> {
					inst.setNativePushToken(null);
					inst.setExpoPushToken(null);
					inst.setInvalidatedAt(Instant.now());
					String reason = (errorCode != null ? errorCode : "INVALID_TOKEN")
							+ (errorMessage != null ? ": " + errorMessage : "");
					inst.setInvalidationReason(reason.length() > 250 ? reason.substring(0, 250) : reason);
					installationRepository.saveAndFlush(inst);
					log.info("Invalidated stale push token for installation {}: {}", installationId, errorCode);
				});
	}

	@Transactional
	public void touchInstallationPresence(Long userId, String installationId, Long activeOrganizationId) {
		if (userId == null || installationId == null || installationId.isBlank()) {
			return;
		}
		installationRepository.findByInstallationIdAndUserId(installationId.trim(), userId)
				.ifPresent(inst -> {
					inst.setLastSeenAt(Instant.now());
					if (activeOrganizationId != null && activeOrganizationId > 0) {
						inst.setActiveOrganizationId(activeOrganizationId);
					}
					inst.setActive(true);
					installationRepository.save(inst);
				});
	}

	@Transactional
	public void acknowledgeDelivery(
			Long userId, Long notificationId, NotificationDeliveryAckRequest request) {
		if (userId == null || notificationId == null || request == null
				|| request.installationId() == null || request.installationId().isBlank()) {
			return;
		}
		String installationId = request.installationId().trim();
		InstallationDeliveryChannel channel = request.channel() != null
				? request.channel()
				: InstallationDeliveryChannel.WEBSOCKET;

		notificationRepository.findByIdAndRecipientUserId(notificationId, userId)
				.ifPresent(notif -> {
					NotificationInstallationDelivery delivery = deliveryRepository
							.findByNotificationIdAndInstallationId(notificationId, installationId)
							.orElseGet(() -> {
								NotificationInstallationDelivery created = new NotificationInstallationDelivery();
								created.setNotificationId(notificationId);
								created.setRecipientUserId(userId);
								created.setOrganizationId(notif.getOrganizationId());
								created.setInstallationId(installationId);
								created.setChannel(channel);
								return created;
							});
					delivery.setChannel(channel);
					delivery.setStatus(InstallationDeliveryStatus.DELIVERED);
					delivery.setDeliveredAt(Instant.now());
					deliveryRepository.saveAndFlush(delivery);
				});
	}

	private DeviceInstallationResponse toResponse(UserDeviceInstallation entity) {
		boolean hasToken = (entity.getNativePushToken() != null && !entity.getNativePushToken().isBlank())
				|| (entity.getExpoPushToken() != null && !entity.getExpoPushToken().isBlank());
		return new DeviceInstallationResponse(
				entity.getId(),
				entity.getUserId(),
				entity.getInstallationId(),
				entity.getPlatform(),
				entity.getPushProvider(),
				entity.getPushPermissionStatus(),
				hasToken,
				entity.getActiveOrganizationId(),
				entity.isActive(),
				entity.getLastSeenAt(),
				entity.getUpdatedAt());
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}


package com.side.forge.notification.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import com.side.forge.notification.entity.DevicePlatform;
import com.side.forge.notification.entity.DevicePushPermissionStatus;
import com.side.forge.notification.entity.InstallationDeliveryChannel;
import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationDeliveryChannel;
import com.side.forge.notification.entity.NotificationType;
import com.side.forge.notification.entity.PushProviderType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class NotificationDtos {

	private NotificationDtos() {
	}

	public record NotificationResponse(
			Long id,
			Long organizationId,
			Long recipientUserId,
			NotificationCategory category,
			NotificationType type,
			String title,
			String message,
			String resourceType,
			Long resourceId,
			String navigationUrl,
			boolean read,
			Instant readAt,
			Instant createdAt
	) {
	}

	public record UnreadNotificationCountResponse(
			Long organizationId,
			long unreadCount
	) {
	}

	public record MarkAllReadResponse(
			Long organizationId,
			int markedReadCount
	) {
	}

	public record CategoryPreferenceItem(
			@NotNull(message = "Notification category is required")
			NotificationCategory category,

			@NotNull(message = "Enabled flag is required")
			Boolean enabled,

			Set<NotificationDeliveryChannel> channels
	) {
	}

	public record UpdateNotificationPreferencesRequest(
			@NotEmpty(message = "Preferences list must not be empty")
			@Valid
			List<CategoryPreferenceItem> preferences
	) {
	}

	public record NotificationPreferenceResponse(
			Long userId,
			Long organizationId,
			List<CategoryPreferenceState> preferences
	) {
	}

	public record CategoryPreferenceState(
			NotificationCategory category,
			boolean enabled,
			Set<NotificationDeliveryChannel> enabledChannels,
			Instant updatedAt
	) {
	}

	public record CreateNotificationCommand(
			Long organizationId,
			Set<Long> recipientUserIds,
			NotificationCategory category,
			NotificationType type,
			String title,
			String message,
			String resourceType,
			Long resourceId,
			String navigationUrl,
			String eventKeyPrefix,
			boolean allowPendingInviteRecipient
	) {
	}

	public record RegisterDeviceInstallationRequest(
			@NotBlank(message = "Installation ID is required")
			@Size(max = 120, message = "Installation ID must not exceed 120 characters")
			String installationId,

			@NotNull(message = "Device platform is required")
			DevicePlatform platform,

			@NotNull(message = "Push provider is required")
			PushProviderType pushProvider,

			@Size(max = 512, message = "Native push token must not exceed 512 characters")
			String nativePushToken,

			@Size(max = 255, message = "Expo push token must not exceed 255 characters")
			String expoPushToken,

			@NotNull(message = "Push permission status is required")
			DevicePushPermissionStatus pushPermissionStatus,

			Long activeOrganizationId,

			@Size(max = 60)
			String appVersion,

			@Size(max = 160)
			String deviceName,

			@Size(max = 80)
			String osVersion
	) {
	}

	public record DeviceInstallationResponse(
			Long id,
			Long userId,
			String installationId,
			DevicePlatform platform,
			PushProviderType pushProvider,
			DevicePushPermissionStatus pushPermissionStatus,
			boolean pushTokenRegistered,
			Long activeOrganizationId,
			boolean active,
			Instant lastSeenAt,
			Instant updatedAt
	) {
	}

	public record NotificationDeliveryAckRequest(
			@NotBlank(message = "Installation ID is required")
			@Size(max = 120)
			String installationId,

			InstallationDeliveryChannel channel
	) {
	}
}

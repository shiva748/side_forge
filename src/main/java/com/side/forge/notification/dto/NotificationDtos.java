package com.side.forge.notification.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationDeliveryChannel;
import com.side.forge.notification.entity.NotificationType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

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
}

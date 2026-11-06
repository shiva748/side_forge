package com.side.forge.notification.spi;

import java.time.Instant;
import java.util.Set;

import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationDeliveryChannel;
import com.side.forge.notification.entity.NotificationType;

/**
 * Provider-independent extension point for future external/real-time notification
 * delivery channels (such as WebSockets, Firebase Cloud Messaging, Email, or SMS).
 *
 * Business modules never interact with this SPI directly; they only call
 * {@link com.side.forge.notification.service.NotificationService}. When a future
 * delivery gateway bean is registered in the Spring context, persisted notifications
 * automatically flow to it without modifying any business module.
 */
public interface NotificationDeliveryGateway {

	record NotificationDispatchEvent(
			Long notificationId,
			Long organizationId,
			Long recipientUserId,
			NotificationCategory category,
			NotificationType type,
			String title,
			String message,
			String resourceType,
			Long resourceId,
			String navigationUrl,
			Set<NotificationDeliveryChannel> enabledChannels,
			Instant createdAt
	) {
	}

	NotificationDeliveryChannel supportedChannel();

	void onNotificationPersisted(NotificationDispatchEvent event);
}

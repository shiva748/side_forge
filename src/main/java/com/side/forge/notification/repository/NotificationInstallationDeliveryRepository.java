package com.side.forge.notification.repository;

import java.util.Collection;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.notification.entity.InstallationDeliveryStatus;
import com.side.forge.notification.entity.NotificationInstallationDelivery;

public interface NotificationInstallationDeliveryRepository
		extends JpaRepository<NotificationInstallationDelivery, Long> {

	Optional<NotificationInstallationDelivery> findByNotificationIdAndInstallationId(
			Long notificationId, String installationId);

	boolean existsByNotificationIdAndInstallationIdAndStatusIn(
			Long notificationId,
			String installationId,
			Collection<InstallationDeliveryStatus> statuses);
}

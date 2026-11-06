package com.side.forge.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.UserNotificationPreference;

public interface UserNotificationPreferenceRepository extends JpaRepository<UserNotificationPreference, Long> {

	Optional<UserNotificationPreference> findByUserIdAndOrganizationIdAndCategory(
			Long userId, Long organizationId, NotificationCategory category);

	List<UserNotificationPreference> findAllByUserIdAndOrganizationIdOrderByCategoryAsc(
			Long userId, Long organizationId);
}

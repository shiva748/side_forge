package com.side.forge.notification.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "user_notification_preferences",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_user_notif_pref_user_org_cat",
						columnNames = {"user_id", "organization_id", "category"}
				)
		},
		indexes = {
				@Index(name = "idx_user_notif_pref_lookup", columnList = "user_id, organization_id")
		}
)
@Getter
@Setter
public class UserNotificationPreference extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 40)
	private NotificationCategory category;

	@Column(name = "in_app_enabled", nullable = false)
	private boolean inAppEnabled = true;

	@Column(name = "enabled_channels", nullable = false, length = 200)
	private String enabledChannels = "IN_APP,PUSH";
}

package com.side.forge.notification.entity;

import java.time.Instant;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "in_app_notifications",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_in_app_notif_recipient_event",
						columnNames = {"recipient_user_id", "organization_id", "event_key"}
				),
				@UniqueConstraint(name = "uk_in_app_notif_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_notif_recipient_org_read", columnList = "recipient_user_id, organization_id, is_read, created_at"),
				@Index(name = "idx_notif_recipient_cat", columnList = "recipient_user_id, organization_id, category")
		}
)
@Getter
@Setter
public class InAppNotification extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "recipient_user_id", nullable = false)
	private Long recipientUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 40)
	private NotificationCategory category;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 60)
	private NotificationType type;

	@Column(nullable = false, length = 250)
	private String title;

	@Column(nullable = false, length = 2000)
	private String message;

	@Column(name = "resource_type", length = 80)
	private String resourceType;

	@Column(name = "resource_id")
	private Long resourceId;

	@Column(name = "navigation_url", length = 500)
	private String navigationUrl;

	@Column(name = "event_key", nullable = false, length = 180)
	private String eventKey;

	@Column(name = "is_read", nullable = false)
	private boolean read = false;

	@Column(name = "read_at")
	private Instant readAt;
}

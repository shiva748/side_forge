package com.side.forge.notification.entity;

import java.time.Instant;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "notification_installation_deliveries",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_notif_inst_deliv_notif_inst",
						columnNames = {"notification_id", "installation_id"}
				)
		},
		indexes = {
				@Index(name = "idx_notif_inst_deliv_user_notif", columnList = "recipient_user_id, notification_id"),
				@Index(name = "idx_notif_inst_deliv_inst", columnList = "installation_id")
		}
)
@Getter
@Setter
public class NotificationInstallationDelivery extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "notification_id", nullable = false)
	private Long notificationId;

	@Column(name = "recipient_user_id", nullable = false)
	private Long recipientUserId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "installation_id", nullable = false, length = 120)
	private String installationId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InstallationDeliveryChannel channel;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InstallationDeliveryStatus status;

	@Column(name = "provider_message_id", length = 250)
	private String providerMessageId;

	@Column(name = "error_code", length = 120)
	private String errorCode;

	@Column(name = "error_message", length = 500)
	private String errorMessage;

	@Column(name = "delivered_at")
	private Instant deliveredAt;
}

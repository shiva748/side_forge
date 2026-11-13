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
		name = "user_device_installations",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_device_install_installation_id",
						columnNames = {"installation_id"}
				)
		},
		indexes = {
				@Index(name = "idx_device_install_user_active", columnList = "user_id, active"),
				@Index(name = "idx_device_install_native_token", columnList = "native_push_token")
		}
)
@Getter
@Setter
public class UserDeviceInstallation extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "installation_id", nullable = false, length = 120)
	private String installationId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private DevicePlatform platform;

	@Enumerated(EnumType.STRING)
	@Column(name = "push_provider", nullable = false, length = 20)
	private PushProviderType pushProvider = PushProviderType.NONE;

	@Column(name = "native_push_token", length = 512)
	private String nativePushToken;

	@Column(name = "expo_push_token", length = 255)
	private String expoPushToken;

	@Enumerated(EnumType.STRING)
	@Column(name = "push_permission_status", nullable = false, length = 24)
	private DevicePushPermissionStatus pushPermissionStatus = DevicePushPermissionStatus.UNDETERMINED;

	@Column(name = "active_organization_id")
	private Long activeOrganizationId;

	@Column(name = "app_version", length = 60)
	private String appVersion;

	@Column(name = "device_name", length = 160)
	private String deviceName;

	@Column(name = "os_version", length = 80)
	private String osVersion;

	@Column(nullable = false)
	private boolean active = true;

	@Column(name = "last_seen_at", nullable = false)
	private Instant lastSeenAt = Instant.now();

	@Column(name = "token_updated_at")
	private Instant tokenUpdatedAt;

	@Column(name = "invalidated_at")
	private Instant invalidatedAt;

	@Column(name = "invalidation_reason", length = 250)
	private String invalidationReason;
}

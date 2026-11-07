package com.side.forge.platform.saas.entity;

import java.time.Instant;

import com.side.forge.platform.saas.enums.PlatformAuditAction;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "platform_audit_logs", indexes = {
		@Index(name = "idx_plat_audit_org_created", columnList = "organization_id, created_at"),
		@Index(name = "idx_plat_audit_actor_created", columnList = "actor_user_id, created_at"),
		@Index(name = "idx_plat_audit_action", columnList = "action")
})
@Getter
@Setter
public class PlatformAuditLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "actor_user_id")
	private Long actorUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 50)
	private PlatformAuditAction action;

	@Column(name = "resource_type", nullable = false, length = 60)
	private String resourceType;

	@Column(name = "resource_id")
	private Long resourceId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(nullable = false, length = 500)
	private String summary;

	@Column(columnDefinition = "TEXT")
	private String details;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}
}

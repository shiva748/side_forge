package com.side.forge.authorization.entity;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "authorization_audit_logs", indexes = {
		@Index(name = "idx_auth_audit_target", columnList = "target_user_id, organization_id"),
		@Index(name = "idx_auth_audit_actor_created", columnList = "actor_user_id, created_at")})
public class AuthorizationAuditLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "actor_user_id", nullable = false)
	private Long actorUserId;

	@Column(name = "target_user_id", nullable = false)
	private Long targetUserId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "role_code", nullable = false, length = 100)
	private String roleCode;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Action action;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected AuthorizationAuditLog() {
	}

	public AuthorizationAuditLog(Long actorUserId, Long targetUserId, Long organizationId, String roleCode,
			Action action) {
		this.actorUserId = actorUserId;
		this.targetUserId = targetUserId;
		this.organizationId = organizationId;
		this.roleCode = roleCode;
		this.action = action;
	}

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public enum Action {
		ORGANIZATION_ROLE_ASSIGNED, ORGANIZATION_ROLE_REVOKED, PLATFORM_ROLE_ASSIGNED, PLATFORM_ROLE_REVOKED, MEMBERSHIP_ACTIVATED, MEMBERSHIP_SUSPENDED
	}
}

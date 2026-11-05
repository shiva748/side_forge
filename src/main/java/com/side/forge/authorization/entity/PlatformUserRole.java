package com.side.forge.authorization.entity;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "platform_user_roles", uniqueConstraints = @UniqueConstraint(name = "uk_platform_user_role", columnNames = {
		"user_id", "role_id"}))
public class PlatformUserRole {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "role_id", nullable = false)
	private Long roleId;

	@Column(name = "assigned_by")
	private Long assignedBy;

	@Column(name = "assigned_at", nullable = false, updatable = false)
	private Instant assignedAt;

	protected PlatformUserRole() {
	}

	public PlatformUserRole(Long userId, Long roleId, Long assignedBy) {
		this.userId = userId;
		this.roleId = roleId;
		this.assignedBy = assignedBy;
	}

	@PrePersist
	void onCreate() {
		if (assignedAt == null) {
			assignedAt = Instant.now();
		}
	}
}

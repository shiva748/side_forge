package com.side.forge.authorization.entity;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "membership_roles", uniqueConstraints = @UniqueConstraint(name = "uk_membership_role", columnNames = {
		"membership_id", "role_id"}))
public class MembershipRole {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "membership_id", nullable = false)
	private Long membershipId;

	@Column(name = "role_id", nullable = false)
	private Long roleId;

	@Column(name = "assigned_by")
	private Long assignedBy;

	@Column(name = "assigned_at", nullable = false, updatable = false)
	private Instant assignedAt;

	protected MembershipRole() {
	}

	public MembershipRole(Long membershipId, Long roleId, Long assignedBy) {
		this.membershipId = membershipId;
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

package com.side.forge.authorization.entity;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "organization_memberships", uniqueConstraints = @UniqueConstraint(name = "uk_membership_user_organization", columnNames = {
		"user_id", "organization_id"}))
public class OrganizationMembership {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private MembershipStatus status;

	@Column(name = "joined_at")
	private Instant joinedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected OrganizationMembership() {
	}

	public static OrganizationMembership active(Long userId, Long organizationId) {
		OrganizationMembership membership = new OrganizationMembership();
		membership.userId = userId;
		membership.organizationId = organizationId;
		membership.status = MembershipStatus.ACTIVE;
		membership.joinedAt = Instant.now();
		return membership;
	}

	public Long getId() {
		return id;
	}
	public Long getUserId() {
		return userId;
	}
	public Long getOrganizationId() {
		return organizationId;
	}
	public MembershipStatus getStatus() {
		return status;
	}

	public void changeStatus(MembershipStatus status) {
		this.status = status;
		if (status == MembershipStatus.ACTIVE && this.joinedAt == null) {
			this.joinedAt = Instant.now();
		}
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}
}

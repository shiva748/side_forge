package com.side.forge.authorization.entity;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class Role {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String code;

	@Column(nullable = false, length = 100)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private RoleScope scope;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "description", length = 255)
	private String description;

	@Column(name = "is_system_defined", nullable = false)
	private boolean systemDefined;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Role() {
	}

	public Long getId() {
		return id;
	}
	public String getCode() {
		return code;
	}
	public String getName() {
		return name;
	}
	public RoleScope getScope() {
		return scope;
	}
	public Long getOrganizationId() {
		return organizationId;
	}
	public boolean isSystemDefined() {
		return systemDefined;
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

package com.side.forge.authorization.entity;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "permissions")
public class Permission {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 150)
	private String code;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, length = 100)
	private String module;

	@Column(length = 255)
	private String description;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Permission() {
	}

	public Long getId() {
		return id;
	}
	public String getCode() {
		return code;
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

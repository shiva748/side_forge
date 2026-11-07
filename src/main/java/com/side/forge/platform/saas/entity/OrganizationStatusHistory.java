package com.side.forge.platform.saas.entity;

import java.time.Instant;

import com.side.forge.organization.entity.OrganizationStatus;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organization_status_history", indexes = {
		@Index(name = "idx_org_status_hist_org_created", columnList = "organization_id, created_at")
})
@Getter
@Setter
public class OrganizationStatusHistory {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Enumerated(EnumType.STRING)
	@Column(name = "previous_status", length = 20)
	private OrganizationStatus previousStatus;

	@Enumerated(EnumType.STRING)
	@Column(name = "new_status", nullable = false, length = 20)
	private OrganizationStatus newStatus;

	@Column(nullable = false, length = 1000)
	private String reason;

	@Column(name = "changed_by")
	private Long changedBy;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}
}

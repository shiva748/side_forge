package com.side.forge.platform.saas.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;
import com.side.forge.platform.saas.enums.PlatformFeature;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organization_feature_entitlements", uniqueConstraints = {
		@UniqueConstraint(name = "uk_org_feature_entitlement", columnNames = {"organization_id", "feature"})
}, indexes = {
		@Index(name = "idx_org_feat_ent_org", columnList = "organization_id")
})
@Getter
@Setter
public class OrganizationFeatureEntitlement extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 60)
	private PlatformFeature feature;

	@Column(name = "is_enabled", nullable = false)
	private boolean enabled;

	@Column(length = 500)
	private String reason;

	@Column(name = "expires_at")
	private LocalDate expiresAt;

	@Column(name = "granted_by")
	private Long grantedBy;

	public boolean isActiveOn(LocalDate date) {
		return expiresAt == null || !expiresAt.isBefore(date);
	}
}

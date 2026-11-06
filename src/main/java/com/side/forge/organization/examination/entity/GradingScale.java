package com.side.forge.organization.examination.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "grading_scales",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_grading_scales_org_name", columnNames = {"organization_id", "name"}),
				@UniqueConstraint(name = "uk_grading_scales_id_org", columnNames = {"id", "organization_id"})
		}
)
@Getter
@Setter
public class GradingScale extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(length = 500)
	private String description;

	@Column(nullable = false)
	private boolean active = true;
}

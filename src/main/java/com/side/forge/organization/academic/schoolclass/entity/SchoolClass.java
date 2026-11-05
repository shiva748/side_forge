package com.side.forge.organization.academic.schoolclass.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "classes",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_classes_org_code", columnNames = {"organization_id", "code"}),
				@UniqueConstraint(name = "uk_classes_org_name", columnNames = {"organization_id", "name"}),
				@UniqueConstraint(name = "uk_classes_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_classes_org_active_order", columnList = "organization_id, active, display_order")
		}
)
@Getter
@Setter
public class SchoolClass extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, length = 50)
	private String code;

	@Column(name = "display_order", nullable = false)
	private Integer displayOrder = 1;

	@Column(length = 500)
	private String description;

	@Column(nullable = false)
	private boolean active = true;
}

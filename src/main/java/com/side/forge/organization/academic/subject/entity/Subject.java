package com.side.forge.organization.academic.subject.entity;

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
		name = "subjects",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_subjects_org_code", columnNames = {"organization_id", "code"}),
				@UniqueConstraint(name = "uk_subjects_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_subjects_org_active", columnList = "organization_id, active")
		}
)
@Getter
@Setter
public class Subject extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, length = 50)
	private String code;

	@Column(length = 500)
	private String description;

	@Column(nullable = false)
	private boolean active = true;
}

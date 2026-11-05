package com.side.forge.organization.academic.section.entity;

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
		name = "sections",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_sections_org_session_class_name",
						columnNames = {"organization_id", "academic_session_id", "class_id", "name"}
				),
				@UniqueConstraint(name = "uk_sections_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_sections_org_session_class", columnList = "organization_id, academic_session_id, class_id")
		}
)
@Getter
@Setter
public class Section extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(nullable = false, length = 50)
	private String name;

	@Column
	private Integer capacity;

	@Column(nullable = false)
	private boolean active = true;
}

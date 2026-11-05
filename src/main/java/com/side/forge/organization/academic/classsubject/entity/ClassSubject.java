package com.side.forge.organization.academic.classsubject.entity;

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
		name = "class_subjects",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_class_subjects_org_session_class_subject",
						columnNames = {"organization_id", "academic_session_id", "class_id", "subject_id"}
				)
		},
		indexes = {
				@Index(
						name = "idx_class_subjects_org_session_class_order",
						columnList = "organization_id, academic_session_id, class_id, display_order"
				)
		}
)
@Getter
@Setter
public class ClassSubject extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "subject_id", nullable = false)
	private Long subjectId;

	@Column(nullable = false)
	private boolean compulsory = true;

	@Column(name = "display_order", nullable = false)
	private Integer displayOrder = 1;
}

package com.side.forge.organization.teacher.entity;

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
		name = "teacher_class_assignments",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_tca_org_session_class_teacher",
						columnNames = {"organization_id", "academic_session_id", "class_id", "teacher_id"}
				)
		},
		indexes = {
				@Index(name = "idx_tca_org_session_class", columnList = "organization_id, academic_session_id, class_id"),
				@Index(name = "idx_tca_org_session_teacher", columnList = "organization_id, academic_session_id, teacher_id")
		}
)
@Getter
@Setter
public class TeacherClassAssignment extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "teacher_id", nullable = false)
	private Long teacherId;

	@Column(name = "is_class_teacher", nullable = false)
	private boolean classTeacher = false;

	@Column(length = 500)
	private String remarks;
}

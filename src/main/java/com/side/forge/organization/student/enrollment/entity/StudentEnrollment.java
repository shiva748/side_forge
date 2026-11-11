package com.side.forge.organization.student.enrollment.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
		name = "student_enrollments",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_student_enrollments_org_session_student",
						columnNames = {"organization_id", "academic_session_id", "student_id"}
				)
		},
		indexes = {
				@Index(
						name = "idx_student_enrollments_org_session_class_status",
						columnList = "organization_id, academic_session_id, class_id, status"
				),
				@Index(
						name = "idx_student_enrollments_org_session_class_section",
						columnList = "organization_id, academic_session_id, class_id, section_id"
				),
				@Index(
						name = "idx_student_enrollments_org_student",
						columnList = "organization_id, student_id"
				)
		}
)
@Getter
@Setter
public class StudentEnrollment extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "section_id")
	private Long sectionId;

	@Column(name = "roll_number", length = 30)
	private String rollNumber;

	@Column(name = "enrollment_date", nullable = false)
	private LocalDate enrollmentDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

	@Column(length = 500)
	private String remarks;
}

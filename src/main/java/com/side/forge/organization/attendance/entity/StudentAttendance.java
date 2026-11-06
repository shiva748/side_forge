package com.side.forge.organization.attendance.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "student_attendance",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_student_attendance_org_session_student_date",
						columnNames = {"organization_id", "academic_session_id", "student_id", "attendance_date"}
				)
		},
		indexes = {
				@Index(
						name = "idx_student_attendance_org_session_class_date",
						columnList = "organization_id, academic_session_id, class_id, attendance_date"
				),
				@Index(
						name = "idx_student_attendance_org_student_date",
						columnList = "organization_id, student_id, attendance_date"
				)
		}
)
@Getter
@Setter
public class StudentAttendance extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "enrollment_id", nullable = false)
	private Long enrollmentId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "attendance_date", nullable = false)
	private LocalDate attendanceDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private StudentAttendanceStatus status;

	@Column(name = "marked_by", nullable = false)
	private Long markedBy;

	@Column(name = "updated_by")
	private Long updatedBy;

	@Column(length = 500)
	private String remarks;
}

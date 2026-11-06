package com.side.forge.organization.examination.entity;

import java.math.BigDecimal;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "exam_marks",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_exam_marks_org_exam_subject_student",
						columnNames = {"organization_id", "examination_id", "subject_id", "student_id"}
				)
		},
		indexes = {
				@Index(name = "idx_exam_marks_org_exam_subject", columnList = "organization_id, examination_id, subject_id"),
				@Index(name = "idx_exam_marks_org_exam_student", columnList = "organization_id, examination_id, student_id")
		}
)
@Getter
@Setter
public class ExamMark extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "examination_id", nullable = false)
	private Long examinationId;

	@Column(name = "exam_schedule_id", nullable = false)
	private Long examScheduleId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "subject_id", nullable = false)
	private Long subjectId;

	@Column(name = "enrollment_id", nullable = false)
	private Long enrollmentId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Enumerated(EnumType.STRING)
	@Column(name = "entry_status", nullable = false, length = 20)
	private MarkEntryStatus entryStatus = MarkEntryStatus.PRESENT;

	@Column(name = "marks_obtained", precision = 6, scale = 2)
	private BigDecimal marksObtained;

	@Column(length = 10)
	private String grade;

	@Column(nullable = false)
	private boolean passed;

	@Column(name = "entered_by", nullable = false)
	private Long enteredBy;

	@Column(name = "updated_by")
	private Long updatedBy;

	@Column(length = 255)
	private String remarks;
}

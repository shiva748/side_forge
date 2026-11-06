package com.side.forge.organization.homework.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "student_homework_submissions",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_student_hw_sub_org_hw_student",
						columnNames = {"organization_id", "homework_id", "student_id"}
				),
				@UniqueConstraint(name = "uk_student_hw_sub_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_shs_org_hw", columnList = "organization_id, homework_id"),
				@Index(name = "idx_shs_org_student_session", columnList = "organization_id, student_id, academic_session_id")
		}
)
@Getter
@Setter
public class StudentHomeworkSubmission extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "homework_id", nullable = false)
	private Long homeworkId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "enrollment_id", nullable = false)
	private Long enrollmentId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private HomeworkSubmissionStatus status = HomeworkSubmissionStatus.PENDING;

	@Column(name = "submission_text", length = 4000)
	private String submissionText;

	@Column(name = "submission_attachments", length = 2000)
	private String submissionAttachments;

	@Column(name = "submission_date")
	private LocalDate submissionDate;

	@Column(name = "submitted_at")
	private Instant submittedAt;

	@Column(name = "last_resubmitted_at")
	private Instant lastResubmittedAt;

	@Column(name = "submission_count", nullable = false)
	private int submissionCount = 0;

	@Column(name = "is_late_submission", nullable = false)
	private boolean lateSubmission = false;

	@Column(name = "marks_awarded", precision = 6, scale = 2)
	private BigDecimal marksAwarded;

	@Column(name = "teacher_feedback", length = 2000)
	private String teacherFeedback;

	@Column(name = "evaluated_by")
	private Long evaluatedBy;

	@Column(name = "evaluated_at")
	private Instant evaluatedAt;
}

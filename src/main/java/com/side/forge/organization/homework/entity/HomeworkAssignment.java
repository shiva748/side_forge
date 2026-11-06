package com.side.forge.organization.homework.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "homework_assignments",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_homework_assignments_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_hw_org_session_class", columnList = "organization_id, academic_session_id, class_id"),
				@Index(name = "idx_hw_org_teacher", columnList = "organization_id, teacher_id")
		}
)
@Getter
@Setter
public class HomeworkAssignment extends AuditableEntity {

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

	@Column(name = "teacher_id", nullable = false)
	private Long teacherId;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 4000)
	private String description;

	@Column(name = "assigned_date", nullable = false)
	private LocalDate assignedDate;

	@Column(name = "due_date", nullable = false)
	private LocalDate dueDate;

	@Column(name = "max_marks", precision = 6, scale = 2)
	private BigDecimal maxMarks;

	@Column(name = "allow_resubmission", nullable = false)
	private boolean allowResubmission = true;

	@Enumerated(EnumType.STRING)
	@Column(name = "late_submission_policy", nullable = false, length = 30)
	private LateSubmissionPolicy lateSubmissionPolicy = LateSubmissionPolicy.REJECT_LATE;

	@Column(name = "reference_attachments", length = 2000)
	private String referenceAttachments;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private HomeworkStatus status = HomeworkStatus.ACTIVE;

	@Column(name = "created_by")
	private Long createdBy;
}

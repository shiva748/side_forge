package com.side.forge.organization.examination.entity;

import java.math.BigDecimal;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "exam_results",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_exam_results_org_exam_student",
						columnNames = {"organization_id", "examination_id", "student_id"}
				)
		},
		indexes = {
				@Index(name = "idx_exam_results_org_exam", columnList = "organization_id, examination_id"),
				@Index(name = "idx_exam_results_org_student", columnList = "organization_id, student_id")
		}
)
@Getter
@Setter
public class StudentExamResult extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "examination_id", nullable = false)
	private Long examinationId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "enrollment_id", nullable = false)
	private Long enrollmentId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "total_obtained_marks", nullable = false, precision = 8, scale = 2)
	private BigDecimal totalObtainedMarks;

	@Column(name = "total_max_marks", nullable = false, precision = 8, scale = 2)
	private BigDecimal totalMaxMarks;

	@Column(nullable = false, precision = 5, scale = 2)
	private BigDecimal percentage;

	@Column(name = "overall_grade", nullable = false, length = 10)
	private String overallGrade;

	@Column(name = "overall_passed", nullable = false)
	private boolean overallPassed;

	@Column(length = 500)
	private String remarks;
}

package com.side.forge.organization.examination.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "exam_schedules",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_exam_schedules_exam_subject",
						columnNames = {"organization_id", "examination_id", "subject_id"}
				),
				@UniqueConstraint(name = "uk_exam_schedules_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_exam_schedules_org_exam_date", columnList = "organization_id, examination_id, exam_date")
		}
)
@Getter
@Setter
public class ExamSchedule extends AuditableEntity {

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

	@Column(name = "subject_id", nullable = false)
	private Long subjectId;

	@Column(name = "exam_date", nullable = false)
	private LocalDate examDate;

	@Column(name = "start_time", nullable = false)
	private LocalTime startTime;

	@Column(name = "end_time", nullable = false)
	private LocalTime endTime;

	@Column(name = "max_marks", nullable = false, precision = 6, scale = 2)
	private BigDecimal maxMarks;

	@Column(name = "passing_marks", nullable = false, precision = 6, scale = 2)
	private BigDecimal passingMarks;

	@Column(name = "invigilator_teacher_id")
	private Long invigilatorTeacherId;

	@Column(length = 50)
	private String room;
}

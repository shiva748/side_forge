package com.side.forge.organization.examination.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "examinations",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_examinations_org_session_class_name",
						columnNames = {"organization_id", "academic_session_id", "class_id", "name"}
				),
				@UniqueConstraint(name = "uk_examinations_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_examinations_org_session_class", columnList = "organization_id, academic_session_id, class_id")
		}
)
@Getter
@Setter
public class Examination extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "grading_scale_id", nullable = false)
	private Long gradingScaleId;

	@Column(nullable = false, length = 150)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "exam_type", nullable = false, length = 30)
	private ExaminationType examType;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ExaminationStatus status = ExaminationStatus.DRAFT;

	@Column(length = 1000)
	private String instructions;

	@Column(name = "finalized_at")
	private Instant finalizedAt;

	@Column(name = "published_at")
	private Instant publishedAt;

	@Column(name = "published_by")
	private Long publishedBy;
}

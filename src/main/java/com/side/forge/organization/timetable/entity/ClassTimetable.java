package com.side.forge.organization.timetable.entity;

import java.time.Instant;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "class_timetables",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_class_timetables_org_session_class_section",
						columnNames = {"organization_id", "academic_session_id", "class_id", "section_id"}
				),
				@UniqueConstraint(name = "uk_class_timetables_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_class_timetables_org_session_status", columnList = "organization_id, academic_session_id, status")
		}
)
@Getter
@Setter
public class ClassTimetable extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "section_id")
	private Long sectionId;

	@Column(name = "timetable_config_id", nullable = false)
	private Long timetableConfigId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TimetableStatus status = TimetableStatus.DRAFT;

	@Column(name = "revision_number", nullable = false)
	private Integer revisionNumber = 1;

	@Column(name = "published_at")
	private Instant publishedAt;

	@Column(name = "published_by")
	private Long publishedBy;

	@Column(length = 500)
	private String notes;
}

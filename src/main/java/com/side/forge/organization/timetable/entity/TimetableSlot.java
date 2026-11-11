package com.side.forge.organization.timetable.entity;

import java.time.DayOfWeek;
import java.time.LocalTime;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "timetable_slots",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_timetable_slots_timetable_day_period",
						columnNames = {"organization_id", "class_timetable_id", "day_of_week", "period_id"}
				),
				@UniqueConstraint(
						name = "uk_timetable_slots_teacher_day_period",
						columnNames = {"organization_id", "academic_session_id", "teacher_id", "day_of_week", "period_id"}
				)
		},
		indexes = {
				@Index(name = "idx_timetable_slots_timetable_day", columnList = "organization_id, class_timetable_id, day_of_week"),
				@Index(name = "idx_timetable_slots_teacher_session_day", columnList = "organization_id, academic_session_id, teacher_id, day_of_week")
		}
)
@Getter
@Setter
public class TimetableSlot extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_timetable_id", nullable = false)
	private Long classTimetableId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "section_id")
	private Long sectionId;

	@Enumerated(EnumType.STRING)
	@Column(name = "day_of_week", nullable = false, length = 15)
	private DayOfWeek dayOfWeek;

	@Column(name = "period_id", nullable = false)
	private Long periodId;

	@Column(name = "start_time", nullable = false)
	private LocalTime startTime;

	@Column(name = "end_time", nullable = false)
	private LocalTime endTime;

	@Column(name = "subject_id", nullable = false)
	private Long subjectId;

	@Column(name = "teacher_id", nullable = false)
	private Long teacherId;

	@Column(length = 50)
	private String room;

	@Column(length = 255)
	private String remarks;
}

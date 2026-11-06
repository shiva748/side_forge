package com.side.forge.organization.timetable.entity;

import java.time.LocalTime;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "timetable_configs",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_timetable_configs_org_name", columnNames = {"organization_id", "name"}),
				@UniqueConstraint(name = "uk_timetable_configs_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_timetable_configs_org_active", columnList = "organization_id, active")
		}
)
@Getter
@Setter
public class TimetableConfig extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(name = "working_days", nullable = false, length = 200)
	private String workingDays;

	@Column(name = "day_start_time", nullable = false)
	private LocalTime dayStartTime;

	@Column(name = "day_end_time", nullable = false)
	private LocalTime dayEndTime;

	@Column(length = 500)
	private String description;

	@Column(nullable = false)
	private boolean active = true;
}

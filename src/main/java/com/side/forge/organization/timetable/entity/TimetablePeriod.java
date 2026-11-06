package com.side.forge.organization.timetable.entity;

import java.time.LocalTime;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "timetable_periods",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_timetable_periods_config_name",
						columnNames = {"organization_id", "timetable_config_id", "name"}
				),
				@UniqueConstraint(
						name = "uk_timetable_periods_config_order",
						columnNames = {"organization_id", "timetable_config_id", "period_order"}
				),
				@UniqueConstraint(name = "uk_timetable_periods_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_timetable_periods_org_config", columnList = "organization_id, timetable_config_id, period_order")
		}
)
@Getter
@Setter
public class TimetablePeriod extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "timetable_config_id", nullable = false)
	private Long timetableConfigId;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(name = "period_order", nullable = false)
	private Integer periodOrder;

	@Column(name = "start_time", nullable = false)
	private LocalTime startTime;

	@Column(name = "end_time", nullable = false)
	private LocalTime endTime;

	@Enumerated(EnumType.STRING)
	@Column(name = "period_type", nullable = false, length = 20)
	private PeriodType periodType = PeriodType.TEACHING;
}

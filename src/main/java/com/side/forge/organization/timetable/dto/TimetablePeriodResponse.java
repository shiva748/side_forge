package com.side.forge.organization.timetable.dto;

import java.time.Instant;
import java.time.LocalTime;

import com.side.forge.organization.timetable.entity.PeriodType;

public record TimetablePeriodResponse(
		Long id,
		Long organizationId,
		Long timetableConfigId,
		String name,
		Integer periodOrder,
		LocalTime startTime,
		LocalTime endTime,
		PeriodType periodType,
		boolean breakPeriod,
		Instant createdAt,
		Instant updatedAt
) {
}

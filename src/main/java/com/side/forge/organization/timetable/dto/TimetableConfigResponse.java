package com.side.forge.organization.timetable.dto;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

public record TimetableConfigResponse(
		Long id,
		Long organizationId,
		String name,
		List<DayOfWeek> workingDays,
		LocalTime dayStartTime,
		LocalTime dayEndTime,
		String description,
		boolean active,
		List<TimetablePeriodResponse> periods,
		Instant createdAt,
		Instant updatedAt
) {
}

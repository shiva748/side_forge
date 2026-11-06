package com.side.forge.organization.timetable.dto;

import java.time.Instant;
import java.time.LocalTime;

import com.side.forge.organization.timetable.entity.PeriodType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateTimetablePeriodRequest(
		@NotBlank(message = "Period name is required")
		@Size(max = 100)
		String name,

		@NotNull(message = "Period order is required")
		@Positive(message = "Period order must be a positive number")
		Integer periodOrder,

		@NotNull(message = "Period start time is required")
		LocalTime startTime,

		@NotNull(message = "Period end time is required")
		LocalTime endTime,

		@NotNull(message = "Period type is required")
		PeriodType periodType
) {
}

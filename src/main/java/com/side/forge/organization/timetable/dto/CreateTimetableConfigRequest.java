package com.side.forge.organization.timetable.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTimetableConfigRequest(
		@NotBlank(message = "Timetable configuration name is required")
		@Size(max = 100)
		String name,

		@NotEmpty(message = "At least one working day is required")
		Set<DayOfWeek> workingDays,

		@NotNull(message = "Day start time is required")
		LocalTime dayStartTime,

		@NotNull(message = "Day end time is required")
		LocalTime dayEndTime,

		@Size(max = 500)
		String description
) {
}

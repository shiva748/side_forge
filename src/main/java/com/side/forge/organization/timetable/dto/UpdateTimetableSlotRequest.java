package com.side.forge.organization.timetable.dto;

import java.time.DayOfWeek;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateTimetableSlotRequest(
		@NotNull(message = "Day of week is required")
		DayOfWeek dayOfWeek,

		@NotNull(message = "Period ID is required")
		@Positive(message = "Period ID must be a positive number")
		Long periodId,

		@NotNull(message = "Subject ID is required")
		@Positive(message = "Subject ID must be a positive number")
		Long subjectId,

		@NotNull(message = "Teacher ID is required")
		@Positive(message = "Teacher ID must be a positive number")
		Long teacherId,

		@Size(max = 50)
		String room,

		@Size(max = 255)
		String remarks
) {
}

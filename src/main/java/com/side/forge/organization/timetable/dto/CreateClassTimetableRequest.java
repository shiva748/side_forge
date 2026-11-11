package com.side.forge.organization.timetable.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateClassTimetableRequest(
		@NotNull(message = "Academic session ID is required")
		@Positive(message = "Academic session ID must be a positive number")
		Long academicSessionId,

		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@Positive(message = "Section ID must be a positive number")
		Long sectionId,

		@NotNull(message = "Timetable configuration ID is required")
		@Positive(message = "Timetable configuration ID must be a positive number")
		Long timetableConfigId,

		@Size(max = 500)
		String notes
) {
}

package com.side.forge.organization.academic.classsubject.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AssignClassSubjectRequest(
		@NotNull(message = "Subject ID is required")
		@Positive(message = "Subject ID must be a positive number")
		Long subjectId,

		Boolean compulsory,

		@Positive(message = "Display order must be a positive number")
		Integer displayOrder
) {
}

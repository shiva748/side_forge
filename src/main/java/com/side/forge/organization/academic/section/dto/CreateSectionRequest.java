package com.side.forge.organization.academic.section.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateSectionRequest(
		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@NotBlank(message = "Section name is required")
		@Size(max = 50, message = "Section name must not exceed 50 characters")
		String name,

		@Positive(message = "Capacity must be a positive number")
		Integer capacity
) {
}

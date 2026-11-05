package com.side.forge.organization.academic.schoolclass.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateSchoolClassRequest(
		@NotBlank(message = "Class name is required")
		@Size(max = 100, message = "Class name must not exceed 100 characters")
		String name,

		@NotBlank(message = "Class code is required")
		@Size(max = 50, message = "Class code must not exceed 50 characters")
		String code,

		@Positive(message = "Display order must be a positive number")
		Integer displayOrder,

		@Size(max = 500, message = "Description must not exceed 500 characters")
		String description
) {
}

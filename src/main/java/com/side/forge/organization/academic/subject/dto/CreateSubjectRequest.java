package com.side.forge.organization.academic.subject.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSubjectRequest(
		@NotBlank(message = "Subject name is required")
		@Size(max = 100, message = "Subject name must not exceed 100 characters")
		String name,

		@NotBlank(message = "Subject code is required")
		@Size(max = 50, message = "Subject code must not exceed 50 characters")
		String code,

		@Size(max = 500, message = "Description must not exceed 500 characters")
		String description
) {
}

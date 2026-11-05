package com.side.forge.organization.academic.session.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAcademicSessionRequest(
		@NotBlank(message = "Academic session name is required")
		@Size(max = 50, message = "Academic session name must not exceed 50 characters")
		String name
) {
}

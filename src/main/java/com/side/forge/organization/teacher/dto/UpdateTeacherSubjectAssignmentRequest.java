package com.side.forge.organization.teacher.dto;

import jakarta.validation.constraints.Size;

public record UpdateTeacherSubjectAssignmentRequest(
		@Size(max = 500, message = "Remarks must not exceed 500 characters")
		String remarks
) {
}

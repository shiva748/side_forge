package com.side.forge.organization.teacher.dto;

import jakarta.validation.constraints.Size;

public record UpdateTeacherClassAssignmentRequest(
		Boolean classTeacher,

		@Size(max = 500, message = "Remarks must not exceed 500 characters")
		String remarks
) {
}

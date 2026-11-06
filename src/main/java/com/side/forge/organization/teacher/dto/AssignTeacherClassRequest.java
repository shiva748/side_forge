package com.side.forge.organization.teacher.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AssignTeacherClassRequest(
		@NotNull(message = "Teacher ID is required")
		@Positive(message = "Teacher ID must be a positive number")
		Long teacherId,

		Boolean classTeacher,

		@Size(max = 500, message = "Remarks must not exceed 500 characters")
		String remarks
) {
}

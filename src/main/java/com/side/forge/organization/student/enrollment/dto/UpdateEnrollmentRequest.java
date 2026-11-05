package com.side.forge.organization.student.enrollment.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateEnrollmentRequest(
		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@Size(max = 30, message = "Roll number must not exceed 30 characters")
		String rollNumber,

		LocalDate enrollmentDate,

		@Size(max = 500, message = "Remarks must not exceed 500 characters")
		String remarks
) {
}

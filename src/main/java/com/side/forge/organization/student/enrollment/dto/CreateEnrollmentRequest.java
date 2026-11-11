package com.side.forge.organization.student.enrollment.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateEnrollmentRequest(
		@NotNull(message = "Student ID is required")
		@Positive(message = "Student ID must be a positive number")
		Long studentId,

		@NotNull(message = "Academic session ID is required")
		@Positive(message = "Academic session ID must be a positive number")
		Long academicSessionId,

		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@Positive(message = "Section ID must be a positive number")
		Long sectionId,

		@Size(max = 30, message = "Roll number must not exceed 30 characters")
		String rollNumber,

		LocalDate enrollmentDate,

		@Size(max = 500, message = "Remarks must not exceed 500 characters")
		String remarks
) {
}

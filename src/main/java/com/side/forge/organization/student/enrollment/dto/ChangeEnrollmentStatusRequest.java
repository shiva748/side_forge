package com.side.forge.organization.student.enrollment.dto;

import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangeEnrollmentStatusRequest(
		@NotNull(message = "Enrollment status is required")
		EnrollmentStatus status,

		@Size(max = 500, message = "Remarks must not exceed 500 characters")
		String remarks
) {
}

package com.side.forge.organization.teacher.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateTeacherProfileRequest(
		@Size(max = 500, message = "Qualifications must not exceed 500 characters")
		String qualifications,

		@Size(max = 255, message = "Specialization must not exceed 255 characters")
		String specialization,

		@PositiveOrZero(message = "Experience years must not be negative")
		Integer experienceYears,

		@Size(max = 100, message = "Registration number must not exceed 100 characters")
		String registrationNumber,

		@Size(max = 500, message = "Certifications must not exceed 500 characters")
		String certifications,

		@Size(max = 500, message = "Teaching notes must not exceed 500 characters")
		String teachingNotes,

		Boolean availableForAssignment
) {
}

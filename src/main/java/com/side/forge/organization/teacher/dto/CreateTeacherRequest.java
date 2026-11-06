package com.side.forge.organization.teacher.dto;

import java.time.LocalDate;

import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.student.profile.entity.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Supports either attaching a teacher profile to an existing staff member
 * (when staffId is provided) OR registering a new staff member + teacher
 * profile in a single operation (when staff fields are provided).
 */
public record CreateTeacherRequest(
		@Positive(message = "Staff ID must be a positive number")
		Long staffId,

		@Size(max = 50, message = "Employee ID must not exceed 50 characters")
		String employeeId,

		@Size(max = 100, message = "First name must not exceed 100 characters")
		String firstName,

		@Size(max = 100, message = "Middle name must not exceed 100 characters")
		String middleName,

		@Size(max = 100, message = "Last name must not exceed 100 characters")
		String lastName,

		LocalDate dateOfBirth,

		Gender gender,

		@Email(message = "Invalid email address")
		@Size(max = 255)
		String email,

		@Size(max = 20)
		String phoneNumber,

		@Size(max = 20)
		String alternatePhoneNumber,

		@Size(max = 500)
		String address,

		@Size(max = 100)
		String city,

		@Size(max = 100)
		String state,

		@Size(max = 10)
		String postalCode,

		LocalDate joiningDate,

		@Size(max = 100)
		String designation,

		@Size(max = 100)
		String department,

		EmploymentType employmentType,

		@Size(max = 150)
		String emergencyContactName,

		@Size(max = 20)
		String emergencyContactPhone,

		@Size(max = 50)
		String emergencyContactRelation,

		@Size(max = 500)
		String professionalNotes,

		@Positive(message = "User ID must be a positive number")
		Long userId,

		@Size(max = 500)
		String qualifications,

		@Size(max = 255)
		String specialization,

		@PositiveOrZero(message = "Experience years must not be negative")
		Integer experienceYears,

		@Size(max = 100)
		String registrationNumber,

		@Size(max = 500)
		String certifications,

		@Size(max = 500)
		String teachingNotes,

		Boolean availableForAssignment
) {
}

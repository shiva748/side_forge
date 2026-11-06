package com.side.forge.organization.staff.dto;

import java.time.LocalDate;

import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.student.profile.entity.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateStaffRequest(
		@NotBlank(message = "Employee ID is required")
		@Size(max = 50, message = "Employee ID must not exceed 50 characters")
		String employeeId,

		@NotBlank(message = "First name is required")
		@Size(max = 100, message = "First name must not exceed 100 characters")
		String firstName,

		@Size(max = 100, message = "Middle name must not exceed 100 characters")
		String middleName,

		@Size(max = 100, message = "Last name must not exceed 100 characters")
		String lastName,

		@Past(message = "Date of birth must be in the past")
		LocalDate dateOfBirth,

		Gender gender,

		@Email(message = "Invalid email address")
		@Size(max = 255)
		String email,

		@NotBlank(message = "Phone number is required")
		@Size(max = 20, message = "Phone number must not exceed 20 characters")
		String phoneNumber,

		@Size(max = 20, message = "Alternate phone number must not exceed 20 characters")
		String alternatePhoneNumber,

		@Size(max = 500)
		String address,

		@Size(max = 100)
		String city,

		@Size(max = 100)
		String state,

		@Size(max = 10)
		String postalCode,

		@NotNull(message = "Joining date is required")
		LocalDate joiningDate,

		@NotBlank(message = "Designation is required")
		@Size(max = 100, message = "Designation must not exceed 100 characters")
		String designation,

		@Size(max = 100, message = "Department must not exceed 100 characters")
		String department,

		EmploymentType employmentType,

		@Size(max = 150)
		String emergencyContactName,

		@Size(max = 20)
		String emergencyContactPhone,

		@Size(max = 50)
		String emergencyContactRelation,

		Boolean teachingStaff,

		@Size(max = 500)
		String professionalNotes,

		@Positive(message = "User ID must be a positive number")
		Long userId,

		// Optional initial teacher-profile fields when teachingStaff == true
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
		String teachingNotes
) {
}

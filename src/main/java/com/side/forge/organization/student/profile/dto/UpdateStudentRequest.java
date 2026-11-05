package com.side.forge.organization.student.profile.dto;

import java.time.LocalDate;

import com.side.forge.organization.student.profile.entity.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateStudentRequest(
		@NotBlank(message = "Admission number is required")
		@Size(max = 50, message = "Admission number must not exceed 50 characters")
		String admissionNumber,

		@NotBlank(message = "First name is required")
		@Size(max = 100, message = "First name must not exceed 100 characters")
		String firstName,

		@Size(max = 100, message = "Middle name must not exceed 100 characters")
		String middleName,

		@Size(max = 100, message = "Last name must not exceed 100 characters")
		String lastName,

		@NotNull(message = "Date of birth is required")
		@Past(message = "Date of birth must be in the past")
		LocalDate dateOfBirth,

		@NotNull(message = "Gender is required")
		Gender gender,

		@Email(message = "Invalid email address")
		@Size(max = 255)
		String email,

		@Size(max = 20, message = "Phone number must not exceed 20 characters")
		String phoneNumber,

		@Size(max = 500, message = "Address must not exceed 500 characters")
		String address,

		@Size(max = 100)
		String city,

		@Size(max = 100)
		String state,

		@Size(max = 10)
		String postalCode,

		@NotNull(message = "Admission date is required")
		LocalDate admissionDate,

		@Size(max = 10)
		String bloodGroup,

		@Size(max = 60)
		String nationality,

		@Positive(message = "User ID must be a positive number")
		Long userId
) {
}

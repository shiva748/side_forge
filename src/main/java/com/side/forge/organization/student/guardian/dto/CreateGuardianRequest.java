package com.side.forge.organization.student.guardian.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateGuardianRequest(
		@NotBlank(message = "First name is required")
		@Size(max = 100, message = "First name must not exceed 100 characters")
		String firstName,

		@Size(max = 100, message = "Last name must not exceed 100 characters")
		String lastName,

		@Email(message = "Invalid email address")
		@Size(max = 255)
		String email,

		@NotBlank(message = "Phone number is required")
		@Size(max = 20, message = "Phone number must not exceed 20 characters")
		String phoneNumber,

		@Size(max = 20, message = "Alternate phone number must not exceed 20 characters")
		String alternatePhoneNumber,

		@Size(max = 500, message = "Address must not exceed 500 characters")
		String address,

		@Size(max = 100, message = "Occupation must not exceed 100 characters")
		String occupation,

		@Positive(message = "User ID must be a positive number")
		Long userId
) {
}

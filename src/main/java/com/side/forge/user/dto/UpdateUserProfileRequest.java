package com.side.forge.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(

		@NotBlank(message = "First name is required")
		@Size(max = 100)
		String firstName,

		@Size(max = 100)
		String lastName,

		@Pattern(
				regexp = "^(\\+91)?[6-9]\\d{9}$",
				message = "Enter a valid 10-digit Indian mobile number"
		)
		String phoneNumber

) {
}

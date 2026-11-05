package com.side.forge.user.dto;

import jakarta.validation.constraints.*;

public record RegisterUserRequest(

		@NotBlank(message = "First name is required") @Size(max = 100) String firstName,

		@Size(max = 100) String lastName,

		@NotNull @NotBlank @Email(message = "Invalid email address") @Size(max = 255) String email,

		@NotBlank @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit Indian mobile number") String phoneNumber,

		@NotBlank(message = "Password is required") @Size(min = 8, max = 72) String password

) {
}

package com.side.forge.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LoginUserRequest(
		@NotNull @NotBlank @Email(message = "Invalid email address") @Size(max = 255) String email,

		@NotBlank(message = "Password is required") @Size(min = 8, max = 72) String password) {
}

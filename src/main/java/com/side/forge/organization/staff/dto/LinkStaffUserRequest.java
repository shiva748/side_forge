package com.side.forge.organization.staff.dto;

import jakarta.validation.constraints.Positive;

public record LinkStaffUserRequest(
		@Positive(message = "User ID must be a positive number")
		Long userId
) {
}

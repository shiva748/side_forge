package com.side.forge.user.dto;

import java.time.Instant;

import com.side.forge.user.entity.UserStatus;

public record UserResponse(

		Long id,

		String firstName,

		String lastName,

		String email,

		String phoneNumber,

		UserStatus status,

		boolean emailVerified,

		boolean phoneVerified,

		Instant createdAt,

		Instant updatedAt

) {
}

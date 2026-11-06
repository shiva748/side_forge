package com.side.forge.user.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

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

		Long profilePhotoFileId,

		String profilePhotoUrl,

		List<UserOrganizationSummary> organizations,

		Instant createdAt,

		Instant updatedAt

) {
	public record UserOrganizationSummary(
			Long organizationId,
			String organizationName,
			String membershipStatus,
			Set<String> roles
	) {
	}
}


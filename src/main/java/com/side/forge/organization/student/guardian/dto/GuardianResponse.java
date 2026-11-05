package com.side.forge.organization.student.guardian.dto;

import java.time.Instant;

public record GuardianResponse(
		Long id,
		Long organizationId,
		Long userId,
		String firstName,
		String lastName,
		String email,
		String phoneNumber,
		String alternatePhoneNumber,
		String address,
		String occupation,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {
}

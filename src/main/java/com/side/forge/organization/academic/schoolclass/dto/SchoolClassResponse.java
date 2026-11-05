package com.side.forge.organization.academic.schoolclass.dto;

import java.time.Instant;

public record SchoolClassResponse(
		Long id,
		Long organizationId,
		String name,
		String code,
		Integer displayOrder,
		String description,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {
}

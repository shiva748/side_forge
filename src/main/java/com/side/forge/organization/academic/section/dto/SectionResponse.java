package com.side.forge.organization.academic.section.dto;

import java.time.Instant;

public record SectionResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		Long classId,
		String name,
		Integer capacity,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {
}

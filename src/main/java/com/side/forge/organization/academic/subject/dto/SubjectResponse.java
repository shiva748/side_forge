package com.side.forge.organization.academic.subject.dto;

import java.time.Instant;

public record SubjectResponse(
		Long id,
		Long organizationId,
		String name,
		String code,
		String description,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {
}

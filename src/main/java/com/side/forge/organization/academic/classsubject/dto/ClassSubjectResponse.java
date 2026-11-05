package com.side.forge.organization.academic.classsubject.dto;

import java.time.Instant;

public record ClassSubjectResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		Long classId,
		Long subjectId,
		boolean compulsory,
		Integer displayOrder,
		Instant createdAt,
		Instant updatedAt
) {
}

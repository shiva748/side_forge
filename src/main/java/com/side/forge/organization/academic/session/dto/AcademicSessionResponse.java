package com.side.forge.organization.academic.session.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;

public record AcademicSessionResponse(
		Long id,
		Long organizationId,
		String name,
		LocalDate startDate,
		LocalDate endDate,
		AcademicSessionStatus status,
		Instant createdAt,
		Instant updatedAt
) {
}

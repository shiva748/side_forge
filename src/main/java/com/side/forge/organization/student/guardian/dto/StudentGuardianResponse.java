package com.side.forge.organization.student.guardian.dto;

import java.time.Instant;

import com.side.forge.organization.student.guardian.entity.GuardianRelationshipType;

public record StudentGuardianResponse(
		Long id,
		Long organizationId,
		Long studentId,
		Long guardianId,
		GuardianRelationshipType relationshipType,
		boolean primaryContact,
		boolean emergencyContact,
		boolean receiveNotifications,
		GuardianResponse guardian,
		Instant createdAt,
		Instant updatedAt
) {
}

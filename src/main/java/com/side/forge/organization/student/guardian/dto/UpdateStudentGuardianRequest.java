package com.side.forge.organization.student.guardian.dto;

import com.side.forge.organization.student.guardian.entity.GuardianRelationshipType;

import jakarta.validation.constraints.NotNull;

public record UpdateStudentGuardianRequest(
		@NotNull(message = "Relationship type is required")
		GuardianRelationshipType relationshipType,

		Boolean primaryContact,

		Boolean emergencyContact,

		Boolean receiveNotifications
) {
}

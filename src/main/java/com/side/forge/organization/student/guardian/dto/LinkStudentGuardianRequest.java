package com.side.forge.organization.student.guardian.dto;

import com.side.forge.organization.student.guardian.entity.GuardianRelationshipType;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record LinkStudentGuardianRequest(
		@NotNull(message = "Guardian ID is required")
		@Positive(message = "Guardian ID must be a positive number")
		Long guardianId,

		@NotNull(message = "Relationship type is required")
		GuardianRelationshipType relationshipType,

		Boolean primaryContact,

		Boolean emergencyContact,

		Boolean receiveNotifications
) {
}

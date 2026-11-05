package com.side.forge.organization.student.guardian.dto;

import java.time.Instant;

import com.side.forge.organization.student.guardian.entity.GuardianRelationshipType;
import com.side.forge.organization.student.profile.dto.StudentResponse;

public record GuardianStudentLinkResponse(
		Long id,
		Long organizationId,
		Long studentId,
		Long guardianId,
		GuardianRelationshipType relationshipType,
		boolean primaryContact,
		boolean emergencyContact,
		boolean receiveNotifications,
		StudentResponse student,
		Instant createdAt,
		Instant updatedAt
) {
}

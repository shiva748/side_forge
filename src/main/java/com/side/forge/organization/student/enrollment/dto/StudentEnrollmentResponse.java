package com.side.forge.organization.student.enrollment.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.profile.dto.StudentResponse;

public record StudentEnrollmentResponse(
		Long id,
		Long organizationId,
		Long studentId,
		Long academicSessionId,
		String academicSessionName,
		Long classId,
		String className,
		String classCode,
		Long sectionId,
		String sectionName,
		String rollNumber,
		LocalDate enrollmentDate,
		EnrollmentStatus status,
		String remarks,
		StudentResponse student,
		Instant createdAt,
		Instant updatedAt
) {
}

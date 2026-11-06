package com.side.forge.organization.attendance.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.attendance.entity.StudentAttendanceStatus;

public record StudentAttendanceResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		Long classId,
		String className,
		Long enrollmentId,
		Long studentId,
		String admissionNumber,
		String studentFirstName,
		String studentLastName,
		LocalDate attendanceDate,
		StudentAttendanceStatus status,
		Long markedBy,
		Long updatedBy,
		String remarks,
		Instant createdAt,
		Instant updatedAt
) {
}

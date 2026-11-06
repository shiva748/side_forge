package com.side.forge.organization.attendance.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.attendance.entity.StaffAttendanceStatus;

public record StaffAttendanceResponse(
		Long id,
		Long organizationId,
		Long staffId,
		String employeeId,
		String staffFirstName,
		String staffLastName,
		LocalDate attendanceDate,
		StaffAttendanceStatus status,
		Long markedBy,
		Long updatedBy,
		String remarks,
		Instant createdAt,
		Instant updatedAt
) {
}

package com.side.forge.organization.attendance.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.attendance.entity.AttendanceAuditLog.TargetType;

public record AttendanceAuditLogResponse(
		Long id,
		Long organizationId,
		TargetType targetType,
		Long attendanceRecordId,
		Long targetPersonId,
		LocalDate attendanceDate,
		String previousStatus,
		String newStatus,
		String previousRemarks,
		String newRemarks,
		Long changedBy,
		String correctionReason,
		Instant changedAt
) {
}

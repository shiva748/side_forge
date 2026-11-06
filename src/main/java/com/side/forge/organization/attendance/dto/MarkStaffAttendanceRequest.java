package com.side.forge.organization.attendance.dto;

import java.time.LocalDate;

import com.side.forge.organization.attendance.entity.StaffAttendanceStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MarkStaffAttendanceRequest(
		@NotNull(message = "Staff ID is required")
		@Positive(message = "Staff ID must be a positive number")
		Long staffId,

		@NotNull(message = "Attendance date is required")
		LocalDate attendanceDate,

		@NotNull(message = "Attendance status is required")
		StaffAttendanceStatus status,

		@Size(max = 500)
		String remarks
) {
}

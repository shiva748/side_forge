package com.side.forge.organization.attendance.dto;

import com.side.forge.organization.attendance.entity.StaffAttendanceStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateStaffAttendanceRequest(
		@NotNull(message = "Attendance status is required")
		StaffAttendanceStatus status,

		@Size(max = 500)
		String remarks,

		@Size(max = 500)
		String correctionReason
) {
}

package com.side.forge.organization.attendance.dto;

import com.side.forge.organization.attendance.entity.StudentAttendanceStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateStudentAttendanceRequest(
		@NotNull(message = "Attendance status is required")
		StudentAttendanceStatus status,

		@Size(max = 500)
		String remarks,

		@Size(max = 500)
		String correctionReason
) {
}

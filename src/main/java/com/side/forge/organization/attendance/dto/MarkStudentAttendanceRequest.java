package com.side.forge.organization.attendance.dto;

import java.time.LocalDate;

import com.side.forge.organization.attendance.entity.StudentAttendanceStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MarkStudentAttendanceRequest(
		@NotNull(message = "Academic session ID is required")
		@Positive(message = "Academic session ID must be a positive number")
		Long academicSessionId,

		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@NotNull(message = "Student ID is required")
		@Positive(message = "Student ID must be a positive number")
		Long studentId,

		@NotNull(message = "Attendance date is required")
		LocalDate attendanceDate,

		@NotNull(message = "Attendance status is required")
		StudentAttendanceStatus status,

		@Size(max = 500)
		String remarks
) {
}

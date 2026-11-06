package com.side.forge.organization.attendance.dto;

public record StudentAttendanceSummaryResponse(
		Long studentId,
		String admissionNumber,
		String studentName,
		int totalRecordedDays,
		int holidayDays,
		int excusedDays,
		int applicableWorkingDays,
		int presentCount,
		int lateCount,
		int halfDayCount,
		int absentCount,
		double attendancePercentage
) {
}

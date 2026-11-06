package com.side.forge.organization.attendance.dto;

public record StaffAttendanceSummaryResponse(
		Long staffId,
		String employeeId,
		String staffName,
		int totalRecordedDays,
		int holidayDays,
		int applicableWorkingDays,
		int presentCount,
		int lateCount,
		int halfDayCount,
		int absentCount,
		int onLeaveCount,
		double attendancePercentage
) {
}

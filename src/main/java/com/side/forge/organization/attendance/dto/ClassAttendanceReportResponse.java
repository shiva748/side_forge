package com.side.forge.organization.attendance.dto;

import java.util.List;

public record ClassAttendanceReportResponse(
		Long academicSessionId,
		Long classId,
		String className,
		double overallAttendancePercentage,
		int presentTotal,
		int absentTotal,
		int lateTotal,
		int halfDayTotal,
		int excusedTotal,
		int holidayTotal,
		List<StudentAttendanceSummaryResponse> studentSummaries
) {
}

package com.side.forge.organization.timetable.dto;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;

public record TimetableSlotResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		Long classTimetableId,
		Long classId,
		String className,
		Long sectionId,
		String sectionName,
		DayOfWeek dayOfWeek,
		Long periodId,
		String periodName,
		Integer periodOrder,
		LocalTime startTime,
		LocalTime endTime,
		Long subjectId,
		String subjectName,
		String subjectCode,
		Long teacherId,
		String teacherFirstName,
		String teacherLastName,
		String room,
		String remarks,
		Instant createdAt,
		Instant updatedAt
) {
}

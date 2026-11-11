package com.side.forge.organization.timetable.dto;

import java.time.Instant;
import java.util.List;

import com.side.forge.organization.timetable.entity.TimetableStatus;

public record ClassTimetableResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		String academicSessionName,
		Long classId,
		String className,
		String classCode,
		Long sectionId,
		String sectionName,
		Long timetableConfigId,
		String timetableConfigName,
		TimetableStatus status,
		Integer revisionNumber,
		Instant publishedAt,
		Long publishedBy,
		String notes,
		List<TimetableSlotResponse> slots,
		Instant createdAt,
		Instant updatedAt
) {
}

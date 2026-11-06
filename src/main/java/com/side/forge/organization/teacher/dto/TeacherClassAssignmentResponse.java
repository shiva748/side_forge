package com.side.forge.organization.teacher.dto;

import java.time.Instant;

public record TeacherClassAssignmentResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		String academicSessionName,
		Long classId,
		String className,
		String classCode,
		Long teacherId,
		Long staffId,
		String teacherEmployeeId,
		String teacherFirstName,
		String teacherLastName,
		boolean classTeacher,
		String remarks,
		Instant createdAt,
		Instant updatedAt
) {
}

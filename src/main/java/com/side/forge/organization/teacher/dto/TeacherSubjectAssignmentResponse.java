package com.side.forge.organization.teacher.dto;

import java.time.Instant;

public record TeacherSubjectAssignmentResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		String academicSessionName,
		Long classId,
		String className,
		String classCode,
		Long subjectId,
		String subjectName,
		String subjectCode,
		Long teacherId,
		Long staffId,
		String teacherEmployeeId,
		String teacherFirstName,
		String teacherLastName,
		String remarks,
		Instant createdAt,
		Instant updatedAt
) {
}

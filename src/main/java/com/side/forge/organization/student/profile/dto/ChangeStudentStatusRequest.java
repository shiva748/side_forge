package com.side.forge.organization.student.profile.dto;

import com.side.forge.organization.student.profile.entity.StudentStatus;

import jakarta.validation.constraints.NotNull;

public record ChangeStudentStatusRequest(
		@NotNull(message = "Student status is required")
		StudentStatus status
) {
}

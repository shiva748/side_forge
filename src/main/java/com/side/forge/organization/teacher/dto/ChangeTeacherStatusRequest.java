package com.side.forge.organization.teacher.dto;

import java.time.LocalDate;

import com.side.forge.organization.staff.entity.EmploymentStatus;

import jakarta.validation.constraints.Size;

public record ChangeTeacherStatusRequest(
		EmploymentStatus employmentStatus,

		Boolean availableForAssignment,

		LocalDate leavingDate,

		@Size(max = 500)
		String teachingNotes
) {
}

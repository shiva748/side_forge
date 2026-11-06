package com.side.forge.organization.staff.dto;

import java.time.LocalDate;

import com.side.forge.organization.staff.entity.EmploymentStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangeStaffStatusRequest(
		@NotNull(message = "Employment status is required")
		EmploymentStatus employmentStatus,

		LocalDate leavingDate,

		@Size(max = 500)
		String professionalNotes
) {
}

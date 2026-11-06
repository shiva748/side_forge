package com.side.forge.organization.examination.dto;

import java.time.LocalDate;

import com.side.forge.organization.examination.entity.ExaminationStatus;
import com.side.forge.organization.examination.entity.ExaminationType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateExaminationRequest(
		@NotNull(message = "Academic session ID is required")
		@Positive(message = "Academic session ID must be a positive number")
		Long academicSessionId,

		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@NotNull(message = "Grading scale ID is required")
		@Positive(message = "Grading scale ID must be a positive number")
		Long gradingScaleId,

		@NotBlank(message = "Examination name is required")
		@Size(max = 150)
		String name,

		@NotNull(message = "Examination type is required")
		ExaminationType examType,

		@NotNull(message = "Start date is required")
		LocalDate startDate,

		@NotNull(message = "End date is required")
		LocalDate endDate,

		@Size(max = 1000)
		String instructions
) {
	public record ChangeExamStatusRequest(
			@NotNull(message = "Target examination status is required")
			ExaminationStatus status
	) {
	}
}

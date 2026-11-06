package com.side.forge.organization.examination.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ScheduleExamSubjectRequest(
		@NotNull(message = "Subject ID is required")
		@Positive(message = "Subject ID must be a positive number")
		Long subjectId,

		@NotNull(message = "Examination date is required")
		LocalDate examDate,

		@NotNull(message = "Start time is required")
		LocalTime startTime,

		@NotNull(message = "End time is required")
		LocalTime endTime,

		@NotNull(message = "Maximum marks is required")
		@DecimalMin(value = "0.01", message = "Maximum marks must be positive")
		BigDecimal maxMarks,

		@NotNull(message = "Passing marks is required")
		@DecimalMin(value = "0.0", message = "Passing marks must not be negative")
		BigDecimal passingMarks,

		@Positive(message = "Invigilator teacher ID must be a positive number")
		Long invigilatorTeacherId,

		@Size(max = 50)
		String room
) {
	public record ExamScheduleResponse(
			Long id,
			Long organizationId,
			Long examinationId,
			Long subjectId,
			String subjectName,
			String subjectCode,
			LocalDate examDate,
			LocalTime startTime,
			LocalTime endTime,
			BigDecimal maxMarks,
			BigDecimal passingMarks,
			Long invigilatorTeacherId,
			String room,
			Instant createdAt,
			Instant updatedAt
	) {
	}
}

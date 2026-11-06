package com.side.forge.organization.examination.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.side.forge.organization.examination.entity.MarkEntryStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record EnterMarkRequest(
		@NotNull(message = "Subject ID is required")
		@Positive(message = "Subject ID must be a positive number")
		Long subjectId,

		@NotNull(message = "Student ID is required")
		@Positive(message = "Student ID must be a positive number")
		Long studentId,

		@NotNull(message = "Entry status is required")
		MarkEntryStatus entryStatus,

		BigDecimal marksObtained,

		@Size(max = 255)
		String remarks
) {
	public record BulkMarkEntryRequest(
			@NotNull(message = "Subject ID is required")
			@Positive(message = "Subject ID must be a positive number")
			Long subjectId,

			@NotEmpty(message = "At least one student mark entry is required")
			@Valid
			List<StudentMarkItem> entries
	) {
	}

	public record StudentMarkItem(
			@NotNull(message = "Student ID is required")
			@Positive(message = "Student ID must be a positive number")
			Long studentId,

			@NotNull(message = "Entry status is required")
			MarkEntryStatus entryStatus,

			BigDecimal marksObtained,

			@Size(max = 255)
			String remarks
	) {
	}

	public record ExamMarkResponse(
			Long id,
			Long organizationId,
			Long examinationId,
			Long examScheduleId,
			Long subjectId,
			String subjectName,
			String subjectCode,
			Long studentId,
			String admissionNumber,
			String studentFirstName,
			String studentLastName,
			MarkEntryStatus entryStatus,
			BigDecimal marksObtained,
			BigDecimal maxMarks,
			BigDecimal passingMarks,
			String grade,
			boolean passed,
			Long enteredBy,
			Long updatedBy,
			String remarks,
			Instant createdAt,
			Instant updatedAt
	) {
	}
}

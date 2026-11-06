package com.side.forge.organization.fees.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.side.forge.organization.fees.entity.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record CreateClassFeeStructureRequest(
		@NotNull(message = "Academic session ID is required")
		@Positive(message = "Academic session ID must be a positive number")
		Long academicSessionId,

		@NotNull(message = "Class ID is required")
		@Positive(message = "Class ID must be a positive number")
		Long classId,

		@NotBlank(message = "Fee structure name is required")
		@Size(max = 150)
		String name,

		LocalDate effectiveFromDate,

		@Size(max = 500)
		String notes,

		@NotEmpty(message = "At least one fee component is required")
		@Valid
		List<ComponentItem> components
) {
	public record ComponentItem(
			@NotBlank(message = "Component name is required")
			@Size(max = 120)
			String name,

			@NotBlank(message = "Component code is required")
			@Size(max = 40)
			String code,

			@NotNull(message = "Component category is required")
			FeeCategory category,

			@NotNull(message = "Component frequency is required")
			FeeFrequency frequency,

			@NotNull(message = "Component amount is required")
			@DecimalMin(value = "0.01", message = "Component amount must be positive")
			BigDecimal amount,

			List<@Min(1) @Max(12) Integer> applicableMonths,

			@Min(value = 1, message = "Due day of month must be between 1 and 28")
			@Max(value = 28, message = "Due day of month must be between 1 and 28")
			Integer dueDayOfMonth,

			LocalDate dueDate,

			OneTimeTriggerCondition oneTimeTrigger,

			LateFeeType lateFeeType,

			@DecimalMin(value = "0.0", message = "Late fee amount cannot be negative")
			BigDecimal lateFeeAmount,

			@Min(value = 0, message = "Grace days cannot be negative")
			Integer lateFeeGraceDays,

			@DecimalMin(value = "0.0", message = "Late fee cap cannot be negative")
			BigDecimal lateFeeCap,

			Boolean optionalComponent,

			Integer displayOrder
	) {
	}

	public record ReviseFeeStructureRequest(
			@NotBlank(message = "Revised fee structure name is required")
			@Size(max = 150)
			String name,

			@NotNull(message = "Effective from date is required for a revision")
			LocalDate effectiveFromDate,

			@Size(max = 500)
			String notes,

			@NotEmpty(message = "At least one fee component is required")
			@Valid
			List<ComponentItem> components
	) {
	}

	public record FeeComponentResponse(
			Long id,
			String name,
			String code,
			FeeCategory category,
			FeeFrequency frequency,
			BigDecimal amount,
			List<Integer> applicableMonths,
			Integer dueDayOfMonth,
			LocalDate dueDate,
			OneTimeTriggerCondition oneTimeTrigger,
			LateFeeType lateFeeType,
			BigDecimal lateFeeAmount,
			int lateFeeGraceDays,
			BigDecimal lateFeeCap,
			boolean optionalComponent,
			int displayOrder
	) {
	}

	public record ClassFeeStructureResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			String academicSessionName,
			Long classId,
			String className,
			String name,
			int versionNumber,
			FeeStructureStatus status,
			LocalDate effectiveFromDate,
			Instant publishedAt,
			Long publishedBy,
			String notes,
			BigDecimal totalMonthlyAmount,
			BigDecimal totalYearlyAmount,
			BigDecimal totalOneTimeAmount,
			BigDecimal totalAnnualEstimatedAmount,
			List<FeeComponentResponse> components,
			Instant createdAt,
			Instant updatedAt
	) {
	}
}

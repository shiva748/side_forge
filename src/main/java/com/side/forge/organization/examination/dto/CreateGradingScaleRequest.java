package com.side.forge.organization.examination.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateGradingScaleRequest(
		@NotBlank(message = "Grading scale name is required")
		@Size(max = 100)
		String name,

		@Size(max = 500)
		String description,

		@Valid
		List<RuleItem> rules
) {
	public record RuleItem(
			@NotBlank(message = "Grade code is required")
			@Size(max = 10)
			String grade,

			@NotNull(message = "Minimum percentage is required")
			@DecimalMin(value = "0.0", message = "Minimum percentage must not be negative")
			@DecimalMax(value = "100.0", message = "Minimum percentage must not exceed 100")
			BigDecimal minPercentage,

			@NotNull(message = "Maximum percentage is required")
			@DecimalMin(value = "0.0", message = "Maximum percentage must not be negative")
			@DecimalMax(value = "100.0", message = "Maximum percentage must not exceed 100")
			BigDecimal maxPercentage,

			BigDecimal gradePoint,

			Boolean passing,

			@Size(max = 200)
			String remarks
	) {
	}

	public record GradingRuleResponse(
			Long id,
			String grade,
			BigDecimal minPercentage,
			BigDecimal maxPercentage,
			BigDecimal gradePoint,
			boolean passing,
			String remarks
	) {
	}

	public record GradingScaleResponse(
			Long id,
			Long organizationId,
			String name,
			String description,
			boolean active,
			List<GradingRuleResponse> rules,
			Instant createdAt,
			Instant updatedAt
	) {
	}
}

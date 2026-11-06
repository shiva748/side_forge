package com.side.forge.organization.fees.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.fees.entity.*;

import jakarta.validation.constraints.*;

public record GenerateFeeDemandsRequest(
		@Min(1) @Max(12)
		Integer applicableFromMonth,

		Boolean newAdmission,

		Boolean includeOneTimeManualCharges,

		@Size(max = 500)
		String remarks
) {
	public record ApplyConcessionRequest(
			@NotNull(message = "Academic session ID is required")
			@Positive
			Long academicSessionId,

			@Size(max = 40)
			String componentCode,

			@NotNull(message = "Concession type is required")
			ConcessionType concessionType,

			@DecimalMin(value = "0.0", message = "Concession value cannot be negative")
			BigDecimal value,

			@Min(1) @Max(12)
			Integer applicableFromMonth,

			@Min(1) @Max(12)
			Integer applicableToMonth,

			@NotBlank(message = "Reason for concession or waiver is required")
			@Size(max = 500)
			String reason
	) {
	}

	public record WaiveDemandRequest(
			@DecimalMin(value = "0.01", message = "Waiver amount must be positive when specified")
			BigDecimal waiverAmount,

			@NotBlank(message = "Waiver reason is required")
			@Size(max = 500)
			String reason
	) {
	}

	public record ApplyLateFeeRequest(
			LocalDate evaluationDate
	) {
	}

	public record ConcessionResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			Long studentId,
			Long enrollmentId,
			String componentCode,
			ConcessionType concessionType,
			BigDecimal value,
			Integer applicableFromMonth,
			Integer applicableToMonth,
			String reason,
			Long approvedBy,
			Instant approvedAt,
			boolean active
	) {
	}

	public record StudentFeeDemandResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			Long classId,
			String className,
			Long enrollmentId,
			Long studentId,
			String admissionNumber,
			String studentName,
			Long feeStructureId,
			int feeStructureVersion,
			Long componentId,
			String componentCode,
			String componentName,
			FeeCategory category,
			FeeFrequency frequency,
			int billingYear,
			int billingMonth,
			String periodLabel,
			LocalDate dueDate,
			BigDecimal baseAmount,
			BigDecimal concessionAmount,
			BigDecimal lateFeeAmount,
			BigDecimal netPayableAmount,
			BigDecimal paidAmount,
			BigDecimal outstandingAmount,
			FeeDemandStatus status,
			String remarks,
			Instant createdAt,
			Instant updatedAt
	) {
	}

	public record FeeAuditLogResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			Long studentId,
			String entityType,
			Long entityId,
			String action,
			String previousState,
			String newState,
			String reason,
			Long performedBy,
			Instant performedAt
	) {
	}
}

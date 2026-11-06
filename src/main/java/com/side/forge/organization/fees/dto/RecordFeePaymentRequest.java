package com.side.forge.organization.fees.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.side.forge.organization.fees.entity.PaymentMethod;
import com.side.forge.organization.fees.entity.PaymentStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record RecordFeePaymentRequest(
		@NotNull(message = "Academic session ID is required")
		@Positive
		Long academicSessionId,

		@NotNull(message = "Student ID is required")
		@Positive
		Long studentId,

		@NotNull(message = "Payment date is required")
		LocalDate paymentDate,

		@NotNull(message = "Total payment amount is required")
		@DecimalMin(value = "0.01", message = "Payment amount must be positive")
		BigDecimal totalAmount,

		@NotNull(message = "Payment method is required")
		PaymentMethod paymentMethod,

		@Size(max = 100)
		String referenceNumber,

		@Size(max = 100)
		String idempotencyKey,

		@Size(max = 500)
		String remarks,

		@NotEmpty(message = "At least one fee demand allocation is required")
		@Valid
		List<DemandAllocationItem> allocations
) {
	public record DemandAllocationItem(
			@NotNull(message = "Demand ID is required")
			@Positive
			Long demandId,

			@DecimalMin(value = "0.01", message = "Allocated amount must be positive")
			BigDecimal amount
	) {
	}

	public record ReverseOrRefundPaymentRequest(
			@DecimalMin(value = "0.01", message = "Refund amount must be positive when specified")
			BigDecimal refundAmount,

			@NotBlank(message = "Reason is required for payment reversal or refund")
			@Size(max = 500)
			String reason
	) {
	}

	public record PaymentAllocationResponse(
			Long id,
			Long demandId,
			String componentCode,
			String componentName,
			String periodLabel,
			BigDecimal allocatedAmount,
			boolean reversed
	) {
	}

	public record FeePaymentReceiptResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			String academicSessionName,
			Long studentId,
			String admissionNumber,
			String studentName,
			Long enrollmentId,
			String receiptNumber,
			String idempotencyKey,
			LocalDate paymentDate,
			BigDecimal totalAmount,
			BigDecimal allocatedAmount,
			BigDecimal unappliedCreditAmount,
			BigDecimal refundedAmount,
			PaymentMethod paymentMethod,
			String referenceNumber,
			PaymentStatus status,
			Long recordedBy,
			Long reversedBy,
			Instant reversedAt,
			String reversalReason,
			String remarks,
			List<PaymentAllocationResponse> allocations,
			Instant createdAt
	) {
	}
}

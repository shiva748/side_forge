package com.side.forge.organization.fees.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "fee_payments",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_fp_org_receipt",
						columnNames = {"organization_id", "receipt_number"}
				),
				@UniqueConstraint(
						name = "uk_fp_org_idempotency",
						columnNames = {"organization_id", "idempotency_key"}
				),
				@UniqueConstraint(name = "uk_fp_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_fp_org_session_student", columnList = "organization_id, academic_session_id, student_id"),
				@Index(name = "idx_fp_org_date", columnList = "organization_id, payment_date")
		}
)
@Getter
@Setter
public class FeePayment extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "enrollment_id", nullable = false)
	private Long enrollmentId;

	@Column(name = "receipt_number", nullable = false, length = 60)
	private String receiptNumber;

	@Column(name = "idempotency_key", length = 100)
	private String idempotencyKey;

	@Column(name = "payment_date", nullable = false)
	private LocalDate paymentDate;

	@Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal totalAmount;

	@Column(name = "allocated_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal allocatedAmount;

	@Column(name = "unapplied_credit_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal unappliedCreditAmount = BigDecimal.ZERO;

	@Column(name = "refunded_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal refundedAmount = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_method", nullable = false, length = 30)
	private PaymentMethod paymentMethod;

	@Column(name = "reference_number", length = 100)
	private String referenceNumber;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private PaymentStatus status = PaymentStatus.COMPLETED;

	@Column(name = "recorded_by", nullable = false)
	private Long recordedBy;

	@Column(name = "reversed_by")
	private Long reversedBy;

	@Column(name = "reversed_at")
	private Instant reversedAt;

	@Column(name = "reversal_reason", length = 500)
	private String reversalReason;

	@Column(length = 500)
	private String remarks;

	@Version
	@Column(nullable = false)
	private Long version = 0L;
}

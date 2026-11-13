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
		name = "parent_fee_payment_submissions",
		indexes = {
				@Index(
						name = "idx_pfps_org_session_student",
						columnList = "organization_id, academic_session_id, student_id"
				),
				@Index(
						name = "idx_pfps_org_utr",
						columnList = "organization_id, utr_reference_number"
				)
		}
)
@Getter
@Setter
public class ParentFeePaymentSubmission extends AuditableEntity {

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

	@Column(name = "submitted_by_user_id", nullable = false)
	private Long submittedByUserId;

	@Column(name = "payment_date", nullable = false)
	private LocalDate paymentDate;

	@Column(name = "amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_method", nullable = false, length = 30)
	private PaymentMethod paymentMethod;

	@Column(name = "utr_reference_number", nullable = false, length = 100)
	private String utrOrReferenceNumber;

	@Column(name = "target_demand_ids_csv", length = 500)
	private String targetDemandIdsCsv;

	@Column(length = 500)
	private String remarks;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private OfflinePaymentSubmissionStatus status = OfflinePaymentSubmissionStatus.PENDING_VERIFICATION;

	@Column(name = "reviewed_by")
	private Long reviewedBy;

	@Column(name = "reviewed_at")
	private Instant reviewedAt;

	@Column(name = "review_remarks", length = 500)
	private String reviewRemarks;

	@Column(name = "approved_payment_id")
	private Long approvedPaymentId;

	@Version
	@Column(nullable = false)
	private Long version = 0L;
}

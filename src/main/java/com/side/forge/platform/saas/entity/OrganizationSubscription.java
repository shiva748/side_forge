package com.side.forge.platform.saas.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;
import com.side.forge.platform.saas.enums.BillingInterval;
import com.side.forge.platform.saas.enums.SubscriptionStatus;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organization_subscriptions", indexes = {
		@Index(name = "idx_org_sub_org_current", columnList = "organization_id, is_current"),
		@Index(name = "idx_org_sub_status_expiry", columnList = "status, expiry_date"),
		@Index(name = "idx_org_sub_plan", columnList = "plan_id")
})
@Getter
@Setter
public class OrganizationSubscription extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "plan_id", nullable = false)
	private Long planId;

	@Column(name = "plan_code_snapshot", nullable = false, length = 60)
	private String planCodeSnapshot;

	@Column(name = "plan_name_snapshot", nullable = false, length = 120)
	private String planNameSnapshot;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private SubscriptionStatus status;

	@Enumerated(EnumType.STRING)
	@Column(name = "billing_interval", nullable = false, length = 20)
	private BillingInterval billingInterval;

	@Column(name = "contracted_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal contractedAmount = BigDecimal.ZERO;

	@Column(name = "amount_paid", nullable = false, precision = 12, scale = 2)
	private BigDecimal amountPaid = BigDecimal.ZERO;

	@Column(name = "student_limit_snapshot", nullable = false)
	private Integer studentLimitSnapshot;

	@Column(name = "override_student_limit")
	private Integer overrideStudentLimit;

	@Column(name = "override_reason", length = 500)
	private String overrideReason;

	@Column(name = "override_expires_at")
	private LocalDate overrideExpiresAt;

	@Column(name = "override_granted_by")
	private Long overrideGrantedBy;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "current_period_start", nullable = false)
	private LocalDate currentPeriodStart;

	@Column(name = "current_period_end", nullable = false)
	private LocalDate currentPeriodEnd;

	@Column(name = "next_renewal_date")
	private LocalDate nextRenewalDate;

	@Column(name = "expiry_date", nullable = false)
	private LocalDate expiryDate;

	@Column(name = "is_trial", nullable = false)
	private boolean trial;

	@Column(name = "is_current", nullable = false)
	private boolean currentSubscription = true;

	@Column(name = "effective_date", nullable = false)
	private LocalDate effectiveDate;

	@Column(name = "ended_date")
	private LocalDate endedDate;

	@Column(name = "cancelled_at")
	private Instant cancelledAt;

	@Column(name = "cancellation_reason", length = 500)
	private String cancellationReason;

	@Column(name = "remarks", length = 1000)
	private String remarks;

	@Column(name = "created_by")
	private Long createdBy;

	public int resolveEffectiveStudentLimit(LocalDate today) {
		if (overrideStudentLimit != null && overrideStudentLimit > 0
				&& (overrideExpiresAt == null || !overrideExpiresAt.isBefore(today))) {
			return overrideStudentLimit;
		}
		return studentLimitSnapshot != null ? studentLimitSnapshot : 0;
	}

	public BigDecimal resolveOutstandingAmount() {
		BigDecimal contracted = contractedAmount != null ? contractedAmount : BigDecimal.ZERO;
		BigDecimal paid = amountPaid != null ? amountPaid : BigDecimal.ZERO;
		BigDecimal diff = contracted.subtract(paid);
		return diff.compareTo(BigDecimal.ZERO) > 0 ? diff : BigDecimal.ZERO;
	}
}

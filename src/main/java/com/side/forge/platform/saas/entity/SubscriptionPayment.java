package com.side.forge.platform.saas.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;
import com.side.forge.platform.saas.enums.SubscriptionPaymentMethod;
import com.side.forge.platform.saas.enums.SubscriptionPaymentStatus;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "subscription_payments", uniqueConstraints = {
		@UniqueConstraint(name = "uk_sub_payment_invoice_no", columnNames = "invoice_number")
}, indexes = {
		@Index(name = "idx_sub_pay_org_date", columnList = "organization_id, payment_date"),
		@Index(name = "idx_sub_pay_sub", columnList = "subscription_id")
})
@Getter
@Setter
public class SubscriptionPayment extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "subscription_id", nullable = false)
	private Long subscriptionId;

	@Column(name = "invoice_number", nullable = false, length = 60)
	private String invoiceNumber;

	@Column(name = "payment_date", nullable = false)
	private LocalDate paymentDate;

	@Column(name = "billed_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal billedAmount = BigDecimal.ZERO;

	@Column(name = "amount_received", nullable = false, precision = 12, scale = 2)
	private BigDecimal amountReceived = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_method", nullable = false, length = 30)
	private SubscriptionPaymentMethod paymentMethod;

	@Column(name = "reference_number", length = 120)
	private String referenceNumber;

	@Column(name = "billing_period_start")
	private LocalDate billingPeriodStart;

	@Column(name = "billing_period_end")
	private LocalDate billingPeriodEnd;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private SubscriptionPaymentStatus status = SubscriptionPaymentStatus.PAID;

	@Column(name = "remarks", length = 1000)
	private String remarks;

	@Column(name = "recorded_by")
	private Long recordedBy;
}

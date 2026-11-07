package com.side.forge.platform.saas.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.platform.saas.enums.BillingInterval;
import com.side.forge.platform.saas.enums.SubscriptionEventType;
import com.side.forge.platform.saas.enums.SubscriptionStatus;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organization_subscription_history", indexes = {
		@Index(name = "idx_org_sub_hist_org_created", columnList = "organization_id, created_at"),
		@Index(name = "idx_org_sub_hist_sub", columnList = "subscription_id")
})
@Getter
@Setter
public class OrganizationSubscriptionHistory {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "subscription_id", nullable = false)
	private Long subscriptionId;

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, length = 40)
	private SubscriptionEventType eventType;

	@Column(name = "previous_plan_id")
	private Long previousPlanId;

	@Column(name = "previous_plan_code", length = 60)
	private String previousPlanCode;

	@Column(name = "new_plan_id")
	private Long newPlanId;

	@Column(name = "new_plan_code", length = 60)
	private String newPlanCode;

	@Enumerated(EnumType.STRING)
	@Column(name = "previous_status", length = 30)
	private SubscriptionStatus previousStatus;

	@Enumerated(EnumType.STRING)
	@Column(name = "new_status", nullable = false, length = 30)
	private SubscriptionStatus newStatus;

	@Enumerated(EnumType.STRING)
	@Column(name = "billing_interval", nullable = false, length = 20)
	private BillingInterval billingInterval;

	@Column(name = "contracted_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal contractedAmount;

	@Column(name = "student_limit", nullable = false)
	private Integer studentLimit;

	@Column(name = "effective_date", nullable = false)
	private LocalDate effectiveDate;

	@Column(name = "remarks", length = 1000)
	private String remarks;

	@Column(name = "actor_user_id")
	private Long actorUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}
}

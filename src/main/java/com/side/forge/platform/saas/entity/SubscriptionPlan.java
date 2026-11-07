package com.side.forge.platform.saas.entity;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

import com.side.forge.common.persistence.AuditableEntity;
import com.side.forge.platform.saas.enums.PlatformFeature;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "subscription_plans", uniqueConstraints = {
		@UniqueConstraint(name = "uk_subscription_plan_code", columnNames = "code")
})
@Getter
@Setter
public class SubscriptionPlan extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 60)
	private String code;

	@Column(nullable = false, length = 120)
	private String name;

	@Column(length = 1000)
	private String description;

	@Column(name = "monthly_price", nullable = false, precision = 12, scale = 2)
	private BigDecimal monthlyPrice = BigDecimal.ZERO;

	@Column(name = "yearly_price", nullable = false, precision = 12, scale = 2)
	private BigDecimal yearlyPrice = BigDecimal.ZERO;

	@Column(name = "max_students", nullable = false)
	private Integer maxStudents;

	@Column(name = "is_active", nullable = false)
	private boolean active = true;

	@Column(name = "is_default_trial_plan", nullable = false)
	private boolean defaultTrialPlan = false;

	@Column(name = "default_trial_days", nullable = false)
	private Integer defaultTrialDays = 30;

	@Column(name = "display_order", nullable = false)
	private Integer displayOrder = 1;

	@Column(name = "metadata", length = 2000)
	private String metadata;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(
			name = "subscription_plan_features",
			joinColumns = @JoinColumn(name = "plan_id", nullable = false),
			uniqueConstraints = @UniqueConstraint(name = "uk_plan_feature", columnNames = {"plan_id", "feature_code"})
	)
	@Enumerated(EnumType.STRING)
	@Column(name = "feature_code", nullable = false, length = 60)
	private Set<PlatformFeature> includedFeatures = new LinkedHashSet<>();
}

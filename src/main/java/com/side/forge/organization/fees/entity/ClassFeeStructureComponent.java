package com.side.forge.organization.fees.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "class_fee_structure_components",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_cfsc_structure_code",
						columnNames = {"fee_structure_id", "code"}
				),
				@UniqueConstraint(name = "uk_cfsc_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_cfsc_org_structure", columnList = "organization_id, fee_structure_id")
		}
)
@Getter
@Setter
public class ClassFeeStructureComponent extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "fee_structure_id", nullable = false)
	private Long feeStructureId;

	@Column(nullable = false, length = 120)
	private String name;

	@Column(nullable = false, length = 40)
	private String code;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private FeeCategory category;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private FeeFrequency frequency;

	@Column(nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Column(name = "applicable_months", length = 100)
	private String applicableMonths;

	@Column(name = "due_day_of_month")
	private Integer dueDayOfMonth;

	@Column(name = "due_date")
	private LocalDate dueDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "one_time_trigger", length = 30)
	private OneTimeTriggerCondition oneTimeTrigger;

	@Enumerated(EnumType.STRING)
	@Column(name = "late_fee_type", nullable = false, length = 20)
	private LateFeeType lateFeeType = LateFeeType.NONE;

	@Column(name = "late_fee_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal lateFeeAmount = BigDecimal.ZERO;

	@Column(name = "late_fee_grace_days", nullable = false)
	private int lateFeeGraceDays = 0;

	@Column(name = "late_fee_cap", precision = 12, scale = 2)
	private BigDecimal lateFeeCap;

	@Column(name = "optional_component", nullable = false)
	private boolean optionalComponent = false;

	@Column(name = "display_order", nullable = false)
	private int displayOrder = 1;
}

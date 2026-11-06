package com.side.forge.organization.fees.entity;

import java.math.BigDecimal;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "fee_payment_allocations",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_fpa_payment_demand",
						columnNames = {"payment_id", "demand_id"}
				),
				@UniqueConstraint(name = "uk_fpa_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_fpa_org_payment", columnList = "organization_id, payment_id"),
				@Index(name = "idx_fpa_org_demand", columnList = "organization_id, demand_id")
		}
)
@Getter
@Setter
public class FeePaymentAllocation extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "payment_id", nullable = false)
	private Long paymentId;

	@Column(name = "demand_id", nullable = false)
	private Long demandId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "allocated_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal allocatedAmount;

	@Column(nullable = false)
	private boolean reversed = false;
}

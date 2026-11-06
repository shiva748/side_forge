package com.side.forge.organization.fees.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "student_fee_demands",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_sfd_org_sess_stu_cls_comp_freq_period",
						columnNames = {
								"organization_id", "academic_session_id", "student_id",
								"class_id", "component_code", "frequency", "billing_year", "billing_month"
						}
				),
				@UniqueConstraint(name = "uk_sfd_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_sfd_org_session_student", columnList = "organization_id, academic_session_id, student_id"),
				@Index(name = "idx_sfd_org_session_class", columnList = "organization_id, academic_session_id, class_id"),
				@Index(name = "idx_sfd_org_status_due", columnList = "organization_id, status, due_date")
		}
)
@Getter
@Setter
public class StudentFeeDemand extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "enrollment_id", nullable = false)
	private Long enrollmentId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "fee_structure_id", nullable = false)
	private Long feeStructureId;

	@Column(name = "fee_structure_version", nullable = false)
	private int feeStructureVersion;

	@Column(name = "component_id", nullable = false)
	private Long componentId;

	@Column(name = "component_code", nullable = false, length = 40)
	private String componentCode;

	@Column(name = "component_name", nullable = false, length = 120)
	private String componentName;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private FeeCategory category;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private FeeFrequency frequency;

	@Column(name = "billing_year", nullable = false)
	private int billingYear;

	@Column(name = "billing_month", nullable = false)
	private int billingMonth = 0;

	@Column(name = "period_label", nullable = false, length = 30)
	private String periodLabel;

	@Column(name = "due_date", nullable = false)
	private LocalDate dueDate;

	@Column(name = "base_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal baseAmount;

	@Column(name = "concession_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal concessionAmount = BigDecimal.ZERO;

	@Column(name = "late_fee_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal lateFeeAmount = BigDecimal.ZERO;

	@Column(name = "net_payable_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal netPayableAmount;

	@Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal paidAmount = BigDecimal.ZERO;

	@Column(name = "outstanding_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal outstandingAmount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private FeeDemandStatus status = FeeDemandStatus.PENDING;

	@Column(length = 500)
	private String remarks;

	@Version
	@Column(nullable = false)
	private Long version = 0L;
}

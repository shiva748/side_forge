package com.side.forge.organization.fees.entity;

import java.math.BigDecimal;
import java.time.Instant;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "student_fee_concessions",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_sfc_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_sfc_org_session_student", columnList = "organization_id, academic_session_id, student_id")
		}
)
@Getter
@Setter
public class StudentFeeConcession extends AuditableEntity {

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

	@Column(name = "component_code", length = 40)
	private String componentCode;

	@Enumerated(EnumType.STRING)
	@Column(name = "concession_type", nullable = false, length = 30)
	private ConcessionType concessionType;

	@Column(name = "concession_value", nullable = false, precision = 12, scale = 2)
	private BigDecimal concessionValue;

	@Column(name = "applicable_from_month")
	private Integer applicableFromMonth;

	@Column(name = "applicable_to_month")
	private Integer applicableToMonth;

	@Column(nullable = false, length = 500)
	private String reason;

	@Column(name = "approved_by", nullable = false)
	private Long approvedBy;

	@Column(name = "approved_at", nullable = false)
	private Instant approvedAt;

	@Column(nullable = false)
	private boolean active = true;
}

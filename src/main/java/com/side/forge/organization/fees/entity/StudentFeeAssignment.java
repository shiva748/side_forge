package com.side.forge.organization.fees.entity;

import java.time.Instant;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "student_fee_assignments",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_sfa_org_enrollment_structure",
						columnNames = {"organization_id", "enrollment_id", "fee_structure_id"}
				),
				@UniqueConstraint(name = "uk_sfa_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_sfa_org_session_student", columnList = "organization_id, academic_session_id, student_id")
		}
)
@Getter
@Setter
public class StudentFeeAssignment extends AuditableEntity {

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

	@Column(name = "applicable_from_month", nullable = false)
	private int applicableFromMonth = 1;

	@Column(name = "new_admission", nullable = false)
	private boolean newAdmission = true;

	@Column(nullable = false)
	private boolean active = true;

	@Column(name = "assigned_at", nullable = false)
	private Instant assignedAt;

	@Column(length = 500)
	private String remarks;
}

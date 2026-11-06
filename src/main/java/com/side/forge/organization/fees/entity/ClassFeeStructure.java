package com.side.forge.organization.fees.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "class_fee_structures",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_cfs_org_session_class_ver",
						columnNames = {"organization_id", "academic_session_id", "class_id", "version_number"}
				),
				@UniqueConstraint(name = "uk_cfs_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_cfs_org_session_class", columnList = "organization_id, academic_session_id, class_id")
		}
)
@Getter
@Setter
public class ClassFeeStructure extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id", nullable = false)
	private Long academicSessionId;

	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(name = "version_number", nullable = false)
	private int versionNumber = 1;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private FeeStructureStatus status = FeeStructureStatus.DRAFT;

	@Column(name = "effective_from_date")
	private LocalDate effectiveFromDate;

	@Column(name = "published_at")
	private Instant publishedAt;

	@Column(name = "published_by")
	private Long publishedBy;

	@Column(length = 500)
	private String notes;

	@Version
	@Column(nullable = false)
	private Long version = 0L;
}

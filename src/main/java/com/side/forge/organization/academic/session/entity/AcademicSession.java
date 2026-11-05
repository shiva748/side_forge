package com.side.forge.organization.academic.session.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "academic_sessions",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_academic_sessions_org_name", columnNames = {"organization_id", "name"}),
				@UniqueConstraint(name = "uk_academic_sessions_active_org", columnNames = {"active_organization_id"}),
				@UniqueConstraint(name = "uk_academic_sessions_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_academic_sessions_org_status", columnList = "organization_id, status")
		}
)
@Getter
@Setter
public class AcademicSession extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false, length = 50)
	private String name;

	@Column(name = "start_date")
	private LocalDate startDate;

	@Column(name = "end_date")
	private LocalDate endDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AcademicSessionStatus status = AcademicSessionStatus.PLANNED;

	/**
	 * Populated with organizationId only while status == ACTIVE, and NULL when
	 * PLANNED or COMPLETED. Enforces at the database level via
	 * uk_academic_sessions_active_org that at most one session per organization can
	 * be ACTIVE at any time.
	 */
	@Column(name = "active_organization_id")
	private Long activeOrganizationId;
}

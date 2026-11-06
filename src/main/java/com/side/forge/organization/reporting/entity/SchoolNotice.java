package com.side.forge.organization.reporting.entity;

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
		name = "school_notices",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_school_notices_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_school_notices_org_date", columnList = "organization_id, published_date"),
				@Index(name = "idx_school_notices_org_important", columnList = "organization_id, is_important, active")
		}
)
@Getter
@Setter
public class SchoolNotice extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id")
	private Long academicSessionId;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 2000)
	private String content;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private NoticeAudience audience = NoticeAudience.ALL;

	@Column(name = "is_important", nullable = false)
	private boolean important = false;

	@Column(name = "published_date", nullable = false)
	private LocalDate publishedDate;

	@Column(nullable = false)
	private boolean active = true;

	@Column(name = "created_by")
	private Long createdBy;
}

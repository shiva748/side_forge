package com.side.forge.organization.communication.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "announcements",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_announcements_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_announcements_org_status_pub", columnList = "organization_id, status, publication_date"),
				@Index(name = "idx_announcements_org_creator", columnList = "organization_id, created_by")
		}
)
@Getter
@Setter
public class Announcement extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id")
	private Long academicSessionId;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 4000)
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AnnouncementStatus status = AnnouncementStatus.DRAFT;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_audience", nullable = false, length = 40)
	private AnnouncementAudience targetAudience = AnnouncementAudience.ALL;

	@Column(name = "is_important", nullable = false)
	private boolean important = false;

	@Column(name = "publication_date")
	private LocalDate publicationDate;

	@Column(name = "expiry_date")
	private LocalDate expiryDate;

	@Column(name = "published_at")
	private Instant publishedAt;

	@Column(name = "published_by")
	private Long publishedBy;

	@Column(name = "created_by", nullable = false)
	private Long createdBy;
}

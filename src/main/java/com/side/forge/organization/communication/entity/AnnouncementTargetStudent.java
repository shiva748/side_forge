package com.side.forge.organization.communication.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "announcement_target_students",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_ann_target_student",
						columnNames = {"organization_id", "announcement_id", "student_id"}
				)
		},
		indexes = {
				@Index(name = "idx_ann_target_student_ann", columnList = "organization_id, announcement_id")
		}
)
@Getter
@Setter
public class AnnouncementTargetStudent extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "announcement_id", nullable = false)
	private Long announcementId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;
}

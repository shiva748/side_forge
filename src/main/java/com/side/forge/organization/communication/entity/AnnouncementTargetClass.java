package com.side.forge.organization.communication.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "announcement_target_classes",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_ann_target_class",
						columnNames = {"organization_id", "announcement_id", "class_id"}
				)
		},
		indexes = {
				@Index(name = "idx_ann_target_class_ann", columnList = "organization_id, announcement_id")
		}
)
@Getter
@Setter
public class AnnouncementTargetClass extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "announcement_id", nullable = false)
	private Long announcementId;

	@Column(name = "class_id", nullable = false)
	private Long classId;
}

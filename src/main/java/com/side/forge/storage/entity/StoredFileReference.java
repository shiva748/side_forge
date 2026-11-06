package com.side.forge.storage.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "stored_file_references",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_stored_file_ref_unique",
						columnNames = {"file_id", "resource_type", "resource_id"}
				)
		},
		indexes = {
				@Index(name = "idx_stored_file_ref_file", columnList = "file_id"),
				@Index(name = "idx_stored_file_ref_resource", columnList = "organization_id, resource_type, resource_id")
		}
)
@Getter
@Setter
public class StoredFileReference extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "file_id", nullable = false)
	private Long fileId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "resource_type", nullable = false, length = 60)
	private String resourceType;

	@Column(name = "resource_id", nullable = false)
	private Long resourceId;
}

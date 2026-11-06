package com.side.forge.storage.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "stored_files",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_stored_files_uid", columnNames = {"file_uid"}),
				@UniqueConstraint(name = "uk_stored_files_storage_key", columnNames = {"storage_key"})
		},
		indexes = {
				@Index(name = "idx_stored_files_org_cat", columnList = "organization_id, category"),
				@Index(name = "idx_stored_files_uploader", columnList = "uploaded_by_user_id")
		}
)
@Getter
@Setter
public class StoredFile extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "file_uid", nullable = false, length = 64)
	private String fileUid;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "uploaded_by_user_id", nullable = false)
	private Long uploadedByUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 40)
	private FileResourceCategory category;

	@Column(name = "original_filename", nullable = false, length = 255)
	private String originalFilename;

	@Column(name = "content_type", nullable = false, length = 120)
	private String contentType;

	@Column(name = "size_bytes", nullable = false)
	private long sizeBytes;

	@Column(name = "checksum_sha256", nullable = false, length = 64)
	private String checksumSha256;

	@Column(name = "storage_key", nullable = false, length = 300)
	private String storageKey;
}

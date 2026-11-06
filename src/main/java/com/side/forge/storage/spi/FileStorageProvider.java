package com.side.forge.storage.spi;

import java.time.Instant;
import java.util.Optional;

/**
 * Storage provider abstraction decoupling application modules from any
 * specific physical storage medium (local filesystem, S3, GCS, Azure Blob, etc.).
 */
public interface FileStorageProvider {

	record StorageUploadCommand(
			String storageKey,
			byte[] content,
			String contentType,
			String originalFilename
	) {
	}

	record StoredObjectMetadata(
			String storageKey,
			long sizeBytes,
			Instant lastModified
	) {
	}

	void store(StorageUploadCommand command);

	byte[] retrieve(String storageKey);

	boolean delete(String storageKey);

	boolean exists(String storageKey);

	Optional<StoredObjectMetadata> getObjectMetadata(String storageKey);
}

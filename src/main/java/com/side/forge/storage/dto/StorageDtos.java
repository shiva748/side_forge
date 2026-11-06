package com.side.forge.storage.dto;

import java.time.Instant;

import com.side.forge.storage.entity.FileResourceCategory;

public final class StorageDtos {

	private StorageDtos() {
	}

	public record StoredFileResponse(
			Long id,
			String fileUid,
			Long organizationId,
			Long uploadedByUserId,
			FileResourceCategory category,
			String originalFilename,
			String contentType,
			long sizeBytes,
			String checksumSha256,
			String downloadUrl,
			Instant createdAt
	) {
	}

	public record DownloadedFilePayload(
			StoredFileResponse metadata,
			byte[] content
	) {
	}
}

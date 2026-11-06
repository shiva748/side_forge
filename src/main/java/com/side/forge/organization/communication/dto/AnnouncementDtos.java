package com.side.forge.organization.communication.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.side.forge.organization.communication.entity.AnnouncementAudience;
import com.side.forge.organization.communication.entity.AnnouncementStatus;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class AnnouncementDtos {

	private AnnouncementDtos() {
	}

	public record CreateAnnouncementRequest(
			@Positive
			Long academicSessionId,

			@NotBlank(message = "Announcement title is required")
			@Size(max = 200)
			String title,

			@NotBlank(message = "Announcement description is required")
			@Size(max = 4000)
			String description,

			@NotNull(message = "Target audience is required")
			AnnouncementAudience targetAudience,

			List<@Positive Long> targetClassIds,

			List<@Positive Long> targetStudentIds,

			LocalDate publicationDate,

			LocalDate expiryDate,

			Boolean important,

			Boolean publishImmediately,

			List<@Positive Long> attachmentFileIds
	) {
	}

	public record UpdateAnnouncementRequest(
			@Positive
			Long academicSessionId,

			@NotBlank(message = "Announcement title is required")
			@Size(max = 200)
			String title,

			@NotBlank(message = "Announcement description is required")
			@Size(max = 4000)
			String description,

			@NotNull(message = "Target audience is required")
			AnnouncementAudience targetAudience,

			List<@Positive Long> targetClassIds,

			List<@Positive Long> targetStudentIds,

			LocalDate publicationDate,

			LocalDate expiryDate,

			Boolean important,

			List<@Positive Long> attachmentFileIds
	) {
	}

	public record AnnouncementResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			String title,
			String description,
			AnnouncementStatus status,
			AnnouncementAudience targetAudience,
			List<Long> targetClassIds,
			List<Long> targetStudentIds,
			boolean important,
			LocalDate publicationDate,
			LocalDate expiryDate,
			Instant publishedAt,
			Long publishedBy,
			Long createdBy,
			List<StoredFileResponse> attachments,
			Instant createdAt,
			Instant updatedAt
	) {
	}
}

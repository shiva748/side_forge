package com.side.forge.organization.communication.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.communication.dto.AnnouncementDtos.*;
import com.side.forge.organization.communication.entity.AnnouncementStatus;
import com.side.forge.organization.communication.service.AnnouncementService;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Announcements & Circulars", description = "Create, edit, publish, delete, and view targeted school announcements and attachments")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

	private final AnnouncementService announcementService;

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<AnnouncementResponse>> createAnnouncement(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateAnnouncementRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Announcement created successfully",
						announcementService.createAnnouncement(organizationId, request)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PutMapping("/{announcementId}")
	public ResponseEntity<ApiResponse<AnnouncementResponse>> updateAnnouncement(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@Valid @RequestBody UpdateAnnouncementRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement updated successfully",
				announcementService.updateAnnouncement(organizationId, announcementId, request)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PostMapping("/{announcementId}/publish")
	public ResponseEntity<ApiResponse<AnnouncementResponse>> publishAnnouncementPost(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate publicationDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement published successfully",
				announcementService.publishAnnouncement(organizationId, announcementId, publicationDate)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PatchMapping("/{announcementId}/publish")
	public ResponseEntity<ApiResponse<AnnouncementResponse>> publishAnnouncementPatch(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate publicationDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement published successfully",
				announcementService.publishAnnouncement(organizationId, announcementId, publicationDate)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@DeleteMapping("/{announcementId}")
	public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId) {
		announcementService.deleteAnnouncement(organizationId, announcementId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement deleted successfully", null));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> getVisibleAnnouncements(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate,
			@RequestParam(required = false) Boolean importantOnly) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcements retrieved successfully",
				announcementService.getVisibleAnnouncements(organizationId, referenceDate, importantOnly)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@GetMapping("/manage")
	public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> getManageableAnnouncements(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) AnnouncementStatus status) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Manageable announcements retrieved successfully",
				announcementService.getManageableAnnouncements(organizationId, status)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@GetMapping("/{announcementId}")
	public ResponseEntity<ApiResponse<AnnouncementResponse>> getAnnouncementById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement retrieved successfully",
				announcementService.getAnnouncementById(organizationId, announcementId)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PostMapping(value = "/{announcementId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> uploadAttachment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@RequestParam("file") MultipartFile file) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Announcement attachment uploaded successfully",
						announcementService.uploadAttachment(organizationId, announcementId, file)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PostMapping("/{announcementId}/attachments/{fileId}/link")
	public ResponseEntity<ApiResponse<StoredFileResponse>> linkExistingAttachment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@PathVariable @Positive Long fileId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Existing file linked to announcement successfully",
				announcementService.linkExistingAttachment(organizationId, announcementId, fileId)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@GetMapping("/{announcementId}/attachments")
	public ResponseEntity<ApiResponse<List<StoredFileResponse>>> getAttachments(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement attachments retrieved successfully",
				announcementService.getAttachments(organizationId, announcementId)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@GetMapping("/{announcementId}/attachments/{fileId}")
	public ResponseEntity<byte[]> downloadAttachment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@PathVariable @Positive Long fileId) {
		DownloadedFilePayload payload = announcementService.downloadAttachment(
				organizationId, announcementId, fileId);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + payload.metadata().originalFilename() + "\"")
				.contentType(MediaType.parseMediaType(payload.metadata().contentType()))
				.contentLength(payload.content().length)
				.body(payload.content());
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@DeleteMapping("/{announcementId}/attachments/{fileId}")
	public ResponseEntity<ApiResponse<Void>> deleteAttachment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@PathVariable @Positive Long fileId) {
		announcementService.deleteAttachment(organizationId, announcementId, fileId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Announcement attachment removed successfully", null));
	}
}

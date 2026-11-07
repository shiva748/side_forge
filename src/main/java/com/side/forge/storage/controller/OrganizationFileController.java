package com.side.forge.storage.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.storage.entity.FileResourceCategory;
import com.side.forge.storage.service.FileManagementService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.FILE_STORAGE)
@Tag(name = "Organization File Storage", description = "Tenant-isolated file upload, metadata, download, and cleanup operations")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/files")
@RequiredArgsConstructor
public class OrganizationFileController {

	private final FileManagementService fileService;

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> uploadOrganizationFile(
			@PathVariable @Positive Long organizationId,
			@RequestParam @NotNull FileResourceCategory category,
			@RequestParam("file") MultipartFile file,
			@RequestParam(required = false) String resourceType,
			@RequestParam(required = false) @Positive Long resourceId) {
		StoredFileResponse stored = fileService.storeOrganizationFile(
				organizationId, category, file, resourceType, resourceId);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "File uploaded successfully", stored));
	}

	@GetMapping("/{fileId}/metadata")
	public ResponseEntity<ApiResponse<StoredFileResponse>> getFileMetadata(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long fileId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "File metadata retrieved successfully",
				fileService.getOrganizationFileMetadata(organizationId, fileId)));
	}

	@GetMapping("/{fileId}")
	public ResponseEntity<byte[]> downloadFile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long fileId) {
		DownloadedFilePayload payload = fileService.downloadOrganizationFile(organizationId, fileId);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + payload.metadata().originalFilename() + "\"")
				.contentType(MediaType.parseMediaType(payload.metadata().contentType()))
				.contentLength(payload.content().length)
				.body(payload.content());
	}

	@DeleteMapping("/{fileId}")
	public ResponseEntity<ApiResponse<Void>> deleteFile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long fileId,
			@RequestParam(required = false) String resourceType,
			@RequestParam(required = false) @Positive Long resourceId) {
		fileService.deleteOrganizationFile(organizationId, fileId, resourceType, resourceId);
		return ResponseEntity.ok(new ApiResponse<>(true, "File deleted successfully", null));
	}
}

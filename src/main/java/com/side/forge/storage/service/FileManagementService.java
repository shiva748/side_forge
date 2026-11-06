package com.side.forge.storage.service;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.storage.entity.FileResourceCategory;
import com.side.forge.storage.entity.StoredFile;
import com.side.forge.storage.entity.StoredFileReference;
import com.side.forge.storage.repository.StoredFileReferenceRepository;
import com.side.forge.storage.repository.StoredFileRepository;
import com.side.forge.storage.spi.FileStorageProvider;
import com.side.forge.storage.spi.FileStorageProvider.StorageUploadCommand;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileManagementService {

	private static final Set<String> IMAGE_CONTENT_TYPES = Set.of(
			"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
	);

	private static final Set<String> IMAGE_EXTENSIONS = Set.of(
			"jpg", "jpeg", "png", "webp", "gif"
	);

	private static final Set<String> DOCUMENT_CONTENT_TYPES = Set.of(
			"application/pdf",
			"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
			"text/plain", "text/csv",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"application/zip", "application/x-zip-compressed"
	);

	private static final Set<String> DOCUMENT_EXTENSIONS = Set.of(
			"pdf", "jpg", "jpeg", "png", "webp", "gif",
			"txt", "csv", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip"
	);

	private static final Set<String> FORBIDDEN_EXTENSIONS = Set.of(
			"exe", "bat", "cmd", "sh", "ps1", "vbs", "js", "mjs", "jsp", "php",
			"dll", "so", "dylib", "msi", "com", "scr", "jar", "war", "py", "rb"
	);

	private final FileStorageProvider storageProvider;
	private final StoredFileRepository storedFileRepository;
	private final StoredFileReferenceRepository referenceRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;

	@Value("${forge.storage.max-profile-photo-bytes:5242880}")
	private long maxProfilePhotoBytes;

	@Value("${forge.storage.max-document-bytes:10485760}")
	private long maxDocumentBytes;

	@Transactional
	public StoredFileResponse storeGlobalUserFile(
			Long userId, FileResourceCategory category, MultipartFile file,
			String resourceType, Long resourceId) {
		if (userId == null) {
			throw new IllegalArgumentException("User ID is required");
		}
		if (category != FileResourceCategory.PROFILE_PHOTO) {
			throw new IllegalArgumentException("Global user file upload only supports PROFILE_PHOTO");
		}
		byte[] bytes = extractAndValidateBytes(file, category);
		String safeName = sanitizeOriginalFilename(file.getOriginalFilename(), category);
		String contentType = normalizeAndValidateContentType(file.getContentType(), safeName, category);
		String uid = UUID.randomUUID().toString();
		String storageKey = "users/u-" + userId + "/" + category.name().toLowerCase(Locale.ROOT) + "/" + uid;

		storageProvider.store(new StorageUploadCommand(storageKey, bytes, contentType, safeName));

		StoredFile entity = new StoredFile();
		entity.setFileUid(uid);
		entity.setOrganizationId(null);
		entity.setUploadedByUserId(userId);
		entity.setCategory(category);
		entity.setOriginalFilename(safeName);
		entity.setContentType(contentType);
		entity.setSizeBytes(bytes.length);
		entity.setChecksumSha256(sha256Hex(bytes));
		entity.setStorageKey(storageKey);
		StoredFile saved = storedFileRepository.saveAndFlush(entity);

		String effType = (resourceType == null || resourceType.isBlank()) ? category.name() : resourceType.trim();
		Long effResId = resourceId != null ? resourceId : userId;
		attachReferenceInternal(null, saved.getId(), effType, effResId);

		return toResponse(saved);
	}

	@Transactional
	public StoredFileResponse storeOrganizationFile(
			Long orgId, FileResourceCategory category, MultipartFile file,
			String resourceType, Long resourceId) {
		validator.requireOrganization(orgId);
		if (category == null || category == FileResourceCategory.PROFILE_PHOTO) {
			throw new IllegalArgumentException("Valid organization file category is required");
		}
		verifyOrganizationUploadPermission(orgId, category);

		byte[] bytes = extractAndValidateBytes(file, category);
		String safeName = sanitizeOriginalFilename(file.getOriginalFilename(), category);
		String contentType = normalizeAndValidateContentType(file.getContentType(), safeName, category);
		String uid = UUID.randomUUID().toString();
		String storageKey = "orgs/org-" + orgId + "/" + category.name().toLowerCase(Locale.ROOT) + "/" + uid;

		storageProvider.store(new StorageUploadCommand(storageKey, bytes, contentType, safeName));

		StoredFile entity = new StoredFile();
		entity.setFileUid(uid);
		entity.setOrganizationId(orgId);
		entity.setUploadedByUserId(currentUser.getUserId());
		entity.setCategory(category);
		entity.setOriginalFilename(safeName);
		entity.setContentType(contentType);
		entity.setSizeBytes(bytes.length);
		entity.setChecksumSha256(sha256Hex(bytes));
		entity.setStorageKey(storageKey);
		StoredFile saved = storedFileRepository.saveAndFlush(entity);

		String effType = (resourceType == null || resourceType.isBlank()) ? category.name() : resourceType.trim();
		Long effResId = resourceId != null ? resourceId : saved.getId();
		attachReferenceInternal(orgId, saved.getId(), effType, effResId);

		return toResponse(saved);
	}

	@Transactional
	public void attachReference(Long orgId, Long fileId, String resourceType, Long resourceId) {
		StoredFile file = requireOrganizationFile(orgId, fileId);
		attachReferenceInternal(orgId, file.getId(), resourceType, resourceId);
	}

	@Transactional
	public void detachReference(Long fileId, String resourceType, Long resourceId) {
		if (fileId == null || resourceType == null || resourceId == null) {
			return;
		}
		referenceRepository.findByFileIdAndResourceTypeAndResourceId(fileId, resourceType, resourceId)
				.ifPresent(referenceRepository::delete);
		referenceRepository.flush();
		cleanupFileIfUnreferenced(fileId);
	}

	@Transactional
	public void detachAllReferencesForResource(Long orgId, String resourceType, Long resourceId) {
		List<StoredFileReference> refs = orgId == null
				? referenceRepository.findAllByResourceTypeAndResourceIdOrderByIdAsc(resourceType, resourceId)
				: referenceRepository.findAllByOrganizationIdAndResourceTypeAndResourceIdOrderByIdAsc(
						orgId, resourceType, resourceId);
		if (refs.isEmpty()) {
			return;
		}
		Set<Long> fileIds = refs.stream().map(StoredFileReference::getFileId).collect(Collectors.toSet());
		referenceRepository.deleteAll(refs);
		referenceRepository.flush();
		for (Long fileId : fileIds) {
			cleanupFileIfUnreferenced(fileId);
		}
	}

	@Transactional(readOnly = true)
	public List<StoredFileResponse> getFilesForResource(Long orgId, String resourceType, Long resourceId) {
		List<StoredFileReference> refs = referenceRepository
				.findAllByOrganizationIdAndResourceTypeAndResourceIdOrderByIdAsc(orgId, resourceType, resourceId);
		if (refs.isEmpty()) {
			return List.of();
		}
		List<Long> fileIds = refs.stream().map(StoredFileReference::getFileId).toList();
		Map<Long, StoredFile> fileMap = storedFileRepository
				.findAllByOrganizationIdAndIdInOrderByIdAsc(orgId, fileIds).stream()
				.collect(Collectors.toMap(StoredFile::getId, Function.identity()));
		return fileIds.stream()
				.map(fileMap::get)
				.filter(f -> f != null)
				.map(this::toResponse)
				.toList();
	}

	@Transactional(readOnly = true)
	public StoredFileResponse getOrganizationFileMetadata(Long orgId, Long fileId) {
		validator.requireOrganization(orgId);
		StoredFile file = requireOrganizationFile(orgId, fileId);
		verifyOrganizationDownloadPermission(orgId, file);
		return toResponse(file);
	}

	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadOrganizationFile(Long orgId, Long fileId) {
		validator.requireOrganization(orgId);
		StoredFile file = requireOrganizationFile(orgId, fileId);
		verifyOrganizationDownloadPermission(orgId, file);
		byte[] bytes = storageProvider.retrieve(file.getStorageKey());
		return new DownloadedFilePayload(toResponse(file), bytes);
	}

	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadOrganizationFileForAuthorizedResource(
			Long orgId, Long fileId, String expectedResourceType, Long expectedResourceId) {
		validator.requireOrganization(orgId);
		StoredFile file = requireOrganizationFile(orgId, fileId);
		boolean linked = referenceRepository
				.findByFileIdAndResourceTypeAndResourceId(fileId, expectedResourceType, expectedResourceId)
				.isPresent();
		if (!linked) {
			throw new EntityNotFoundException("File is not attached to the requested resource");
		}
		byte[] bytes = storageProvider.retrieve(file.getStorageKey());
		return new DownloadedFilePayload(toResponse(file), bytes);
	}

	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadGlobalUserFile(Long fileId, Long expectedUserId) {
		StoredFile file = storedFileRepository.findById(fileId)
				.orElseThrow(() -> new EntityNotFoundException("File not found"));
		if (file.getOrganizationId() != null || !file.getUploadedByUserId().equals(expectedUserId)) {
			throw new AccessDeniedException("You do not have permission to access this file");
		}
		byte[] bytes = storageProvider.retrieve(file.getStorageKey());
		return new DownloadedFilePayload(toResponse(file), bytes);
	}

	@Transactional
	public void deleteOrganizationFile(Long orgId, Long fileId, String resourceType, Long resourceId) {
		validator.requireOrganization(orgId);
		StoredFile file = requireOrganizationFile(orgId, fileId);
		verifyOrganizationDeletePermission(orgId, file);

		if (resourceType != null && !resourceType.isBlank() && resourceId != null) {
			StoredFileReference ref = referenceRepository
					.findByFileIdAndResourceTypeAndResourceId(fileId, resourceType.trim(), resourceId)
					.orElseThrow(() -> new EntityNotFoundException("File reference not found for resource"));
			referenceRepository.delete(ref);
			referenceRepository.flush();
			cleanupFileIfUnreferenced(fileId);
			return;
		}

		List<StoredFileReference> refs = referenceRepository.findAllByFileIdOrderByIdAsc(fileId);
		if (refs.size() > 1) {
			referenceRepository.findByFileIdAndResourceTypeAndResourceId(fileId, file.getCategory().name(), fileId)
					.ifPresent(referenceRepository::delete);
			referenceRepository.flush();
			cleanupFileIfUnreferenced(fileId);
			return;
		}
		if (!refs.isEmpty()) {
			referenceRepository.deleteAll(refs);
			referenceRepository.flush();
		}
		cleanupFileIfUnreferenced(fileId);
	}

	public boolean existsInStorage(Long orgId, Long fileId) {
		StoredFile file = requireOrganizationFile(orgId, fileId);
		return storageProvider.exists(file.getStorageKey());
	}

	public StoredFile requireOrganizationFile(Long orgId, Long fileId) {
		return storedFileRepository.findByIdAndOrganizationId(fileId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("File not found in organization"));
	}

	private void attachReferenceInternal(Long orgId, Long fileId, String resourceType, Long resourceId) {
		if (referenceRepository.findByFileIdAndResourceTypeAndResourceId(fileId, resourceType, resourceId).isEmpty()) {
			StoredFileReference ref = new StoredFileReference();
			ref.setFileId(fileId);
			ref.setOrganizationId(orgId);
			ref.setResourceType(resourceType);
			ref.setResourceId(resourceId);
			referenceRepository.saveAndFlush(ref);
		}
	}

	private void cleanupFileIfUnreferenced(Long fileId) {
		if (referenceRepository.countByFileId(fileId) == 0) {
			storedFileRepository.findById(fileId).ifPresent(stored -> {
				storageProvider.delete(stored.getStorageKey());
				storedFileRepository.delete(stored);
			});
		}
	}

	private void verifyOrganizationUploadPermission(Long orgId, FileResourceCategory category) {
		if (currentUser.getOrganizationId() == null || !currentUser.getOrganizationId().equals(orgId)) {
			throw new AccessDeniedException("Organization context mismatch");
		}
		boolean allowed = switch (category) {
			case HOMEWORK_ATTACHMENT -> currentUser.hasPermission(PermissionCode.HOMEWORK_MANAGE.getValue());
			case HOMEWORK_SUBMISSION -> currentUser.hasPermission(PermissionCode.HOMEWORK_SUBMIT.getValue())
					|| currentUser.hasPermission(PermissionCode.HOMEWORK_MANAGE.getValue());
			case STUDENT_DOCUMENT -> currentUser.hasPermission(PermissionCode.STUDENT_CREATE.getValue())
					|| currentUser.hasPermission(PermissionCode.STUDENT_UPDATE.getValue());
			case STAFF_DOCUMENT -> currentUser.hasPermission(PermissionCode.STAFF_MANAGE.getValue())
					|| currentUser.hasPermission(PermissionCode.TEACHER_MANAGE.getValue());
			case NOTICE_ATTACHMENT -> currentUser.hasPermission(PermissionCode.COMMUNICATION_MANAGE.getValue());
			case GENERAL_ORGANIZATION_FILE -> currentUser.hasPermission(PermissionCode.SCHOOL_UPDATE.getValue())
					|| currentUser.hasPermission(PermissionCode.SCHOOL_SETTINGS_MANAGE.getValue())
					|| currentUser.hasRole("SCHOOL_ADMIN");
			case PROFILE_PHOTO -> false;
		};
		if (!allowed) {
			throw new AccessDeniedException("You do not have permission to upload files for category: " + category);
		}
	}

	private void verifyOrganizationDownloadPermission(Long orgId, StoredFile file) {
		if (currentUser.getOrganizationId() == null || !currentUser.getOrganizationId().equals(orgId)) {
			throw new AccessDeniedException("Organization context mismatch");
		}
		boolean isOwner = file.getUploadedByUserId().equals(currentUser.getUserId());
		boolean allowed = switch (file.getCategory()) {
			case HOMEWORK_ATTACHMENT -> currentUser.hasPermission(PermissionCode.HOMEWORK_VIEW.getValue());
			case HOMEWORK_SUBMISSION -> isOwner
					|| currentUser.hasPermission(PermissionCode.HOMEWORK_EVALUATE.getValue())
					|| currentUser.hasPermission(PermissionCode.HOMEWORK_MANAGE.getValue());
			case STUDENT_DOCUMENT -> isOwner || currentUser.hasPermission(PermissionCode.STUDENT_VIEW.getValue());
			case STAFF_DOCUMENT -> isOwner
					|| currentUser.hasPermission(PermissionCode.STAFF_VIEW.getValue())
					|| currentUser.hasPermission(PermissionCode.TEACHER_VIEW.getValue());
			case NOTICE_ATTACHMENT -> currentUser.hasPermission(PermissionCode.COMMUNICATION_VIEW.getValue());
			case GENERAL_ORGANIZATION_FILE -> currentUser.hasPermission(PermissionCode.SCHOOL_VIEW.getValue())
					|| currentUser.hasPermission(PermissionCode.DASHBOARD_VIEW.getValue())
					|| currentUser.hasRole("SCHOOL_ADMIN");
			case PROFILE_PHOTO -> isOwner;
		};
		if (!allowed) {
			throw new AccessDeniedException("You do not have permission to access this file");
		}
	}

	private void verifyOrganizationDeletePermission(Long orgId, StoredFile file) {
		if (currentUser.getOrganizationId() == null || !currentUser.getOrganizationId().equals(orgId)) {
			throw new AccessDeniedException("Organization context mismatch");
		}
		boolean isOwner = file.getUploadedByUserId().equals(currentUser.getUserId());
		boolean allowed = switch (file.getCategory()) {
			case HOMEWORK_ATTACHMENT -> currentUser.hasPermission(PermissionCode.HOMEWORK_MANAGE.getValue());
			case HOMEWORK_SUBMISSION -> (isOwner && currentUser.hasPermission(PermissionCode.HOMEWORK_SUBMIT.getValue()))
					|| currentUser.hasPermission(PermissionCode.HOMEWORK_MANAGE.getValue());
			case STUDENT_DOCUMENT -> currentUser.hasPermission(PermissionCode.STUDENT_UPDATE.getValue())
					|| currentUser.hasPermission(PermissionCode.STUDENT_DELETE.getValue());
			case STAFF_DOCUMENT -> currentUser.hasPermission(PermissionCode.STAFF_MANAGE.getValue())
					|| currentUser.hasPermission(PermissionCode.TEACHER_MANAGE.getValue());
			case NOTICE_ATTACHMENT -> currentUser.hasPermission(PermissionCode.COMMUNICATION_MANAGE.getValue());
			case GENERAL_ORGANIZATION_FILE -> currentUser.hasPermission(PermissionCode.SCHOOL_UPDATE.getValue())
					|| currentUser.hasPermission(PermissionCode.SCHOOL_SETTINGS_MANAGE.getValue())
					|| currentUser.hasRole("SCHOOL_ADMIN");
			case PROFILE_PHOTO -> isOwner;
		};
		if (!allowed) {
			throw new AccessDeniedException("You do not have permission to delete this file");
		}
	}

	private byte[] extractAndValidateBytes(MultipartFile file, FileResourceCategory category) {
		if (file == null || file.isEmpty()) {
			throw new IllegalArgumentException("Uploaded file must not be empty");
		}
		byte[] bytes;
		try {
			bytes = file.getBytes();
		} catch (IOException ex) {
			throw new IllegalStateException("Failed to read uploaded file content", ex);
		}
		if (bytes.length == 0) {
			throw new IllegalArgumentException("Uploaded file must not be empty");
		}
		long maxBytes = category == FileResourceCategory.PROFILE_PHOTO ? maxProfilePhotoBytes : maxDocumentBytes;
		if (bytes.length > maxBytes) {
			throw new IllegalArgumentException(
					"File size (" + bytes.length + " bytes) exceeds maximum allowed limit (" + maxBytes + " bytes)");
		}
		return bytes;
	}

	private String sanitizeOriginalFilename(String rawFilename, FileResourceCategory category) {
		if (rawFilename == null || rawFilename.isBlank()) {
			throw new IllegalArgumentException("Filename is required");
		}
		String normalized = rawFilename.replace('\\', '/').trim();
		int lastSlash = normalized.lastIndexOf('/');
		String baseName = lastSlash >= 0 ? normalized.substring(lastSlash + 1).trim() : normalized;
		if (baseName.isEmpty() || baseName.contains("..") || baseName.contains("\0")) {
			throw new IllegalArgumentException("Invalid filename");
		}
		baseName = baseName.replaceAll("[\\r\\n\"']", "_");
		if (baseName.length() > 255) {
			throw new IllegalArgumentException("Filename must not exceed 255 characters");
		}
		String ext = extractExtension(baseName);
		if (ext.isEmpty()) {
			throw new IllegalArgumentException("File extension is required");
		}
		if (FORBIDDEN_EXTENSIONS.contains(ext)) {
			throw new IllegalArgumentException("Executable or script files are not allowed: ." + ext);
		}
		if (category == FileResourceCategory.PROFILE_PHOTO && !IMAGE_EXTENSIONS.contains(ext)) {
			throw new IllegalArgumentException("Profile photo must be an image file (.jpg, .jpeg, .png, .webp, .gif)");
		}
		if (category != FileResourceCategory.PROFILE_PHOTO && !DOCUMENT_EXTENSIONS.contains(ext)) {
			throw new IllegalArgumentException("Unsupported file extension: ." + ext);
		}
		return baseName;
	}

	private String normalizeAndValidateContentType(
			String rawContentType, String safeFilename, FileResourceCategory category) {
		String ext = extractExtension(safeFilename);
		String contentType = rawContentType == null ? "" : rawContentType.trim().toLowerCase(Locale.ROOT);
		int semicolon = contentType.indexOf(';');
		if (semicolon > 0) {
			contentType = contentType.substring(0, semicolon).trim();
		}
		if (contentType.isEmpty() || "application/octet-stream".equals(contentType)) {
			contentType = inferContentTypeFromExtension(ext);
		}
		if (category == FileResourceCategory.PROFILE_PHOTO) {
			if (!IMAGE_CONTENT_TYPES.contains(contentType)) {
				throw new IllegalArgumentException("Unsupported profile photo content type: " + contentType);
			}
		} else {
			if (!DOCUMENT_CONTENT_TYPES.contains(contentType)) {
				throw new IllegalArgumentException("Unsupported document content type: " + contentType);
			}
		}
		return "image/jpg".equals(contentType) ? "image/jpeg" : contentType;
	}

	private String extractExtension(String filename) {
		int lastDot = filename.lastIndexOf('.');
		if (lastDot <= 0 || lastDot == filename.length() - 1) {
			return "";
		}
		return filename.substring(lastDot + 1).trim().toLowerCase(Locale.ROOT);
	}

	private String inferContentTypeFromExtension(String ext) {
		return switch (ext) {
			case "jpg", "jpeg" -> "image/jpeg";
			case "png" -> "image/png";
			case "webp" -> "image/webp";
			case "gif" -> "image/gif";
			case "pdf" -> "application/pdf";
			case "txt" -> "text/plain";
			case "csv" -> "text/csv";
			case "doc" -> "application/msword";
			case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
			case "xls" -> "application/vnd.ms-excel";
			case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			case "ppt" -> "application/vnd.ms-powerpoint";
			case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
			case "zip" -> "application/zip";
			default -> "application/octet-stream";
		};
	}

	private String sha256Hex(byte[] bytes) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(bytes));
		} catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 algorithm not available", ex);
		}
	}

	public StoredFileResponse toResponse(StoredFile file) {
		String downloadUrl = file.getOrganizationId() != null
				? "/api/organizations/" + file.getOrganizationId() + "/files/" + file.getId()
				: "/api/me/profile-photo";
		return new StoredFileResponse(
				file.getId(),
				file.getFileUid(),
				file.getOrganizationId(),
				file.getUploadedByUserId(),
				file.getCategory(),
				file.getOriginalFilename(),
				file.getContentType(),
				file.getSizeBytes(),
				file.getChecksumSha256(),
				downloadUrl,
				file.getCreatedAt()
		);
	}
}

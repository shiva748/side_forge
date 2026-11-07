package com.side.forge.user.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.entity.OrganizationMembership;
import com.side.forge.authorization.repository.AuthorizationQueryRepository;
import com.side.forge.authorization.repository.OrganizationMembershipRepository;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.entity.OrganizationStatusHistory;
import com.side.forge.platform.saas.repository.OrganizationStatusHistoryRepository;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.storage.entity.FileResourceCategory;
import com.side.forge.storage.service.FileManagementService;
import com.side.forge.user.dto.ChangePasswordRequest;
import com.side.forge.user.dto.UpdateUserProfileRequest;
import com.side.forge.user.dto.UserResponse;
import com.side.forge.user.dto.UserResponse.UserOrganizationSummary;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

	public static final String RESOURCE_USER_PROFILE_PHOTO = "USER_PROFILE_PHOTO";

	private final UserRepository userRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final AuthorizationQueryRepository authorizationQueryRepository;
	private final OrganizationRepository organizationRepository;
	private final OrganizationStatusHistoryRepository statusHistoryRepository;
	private final PasswordEncoder passwordEncoder;
	private final FileManagementService fileManagementService;

	@Transactional(readOnly = true)
	public UserResponse getProfile(Authentication authentication) {
		Users user = requireAuthenticatedUser(authentication);
		return toEnrichedUserResponse(user);
	}

	@Transactional
	public UserResponse updateProfile(Authentication authentication, UpdateUserProfileRequest request) {
		Users user = requireAuthenticatedUser(authentication);
		if (request.firstName() == null || request.firstName().isBlank()) {
			throw new IllegalArgumentException("First name is required");
		}
		user.setFirstName(request.firstName().trim());
		user.setLastName(request.lastName() != null && !request.lastName().isBlank()
				? request.lastName().trim()
				: null);

		if (request.phoneNumber() != null && !request.phoneNumber().isBlank()) {
			String normalizedPhone = normalizePhone(request.phoneNumber());
			Optional<Users> existingByPhone = userRepository.findByPhoneNumber(normalizedPhone);
			if (existingByPhone.isPresent() && !existingByPhone.get().getId().equals(user.getId())) {
				throw new IllegalStateException("Phone number is already registered to another account");
			}
			user.setPhoneNumber(normalizedPhone);
		}

		Users saved = userRepository.saveAndFlush(user);
		return toEnrichedUserResponse(saved);
	}

	@Transactional
	public void changePassword(Authentication authentication, ChangePasswordRequest request) {
		Users user = requireAuthenticatedUser(authentication);
		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			throw new IllegalArgumentException("Current password is incorrect");
		}
		if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
			throw new IllegalArgumentException("New password must be different from the current password");
		}
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepository.saveAndFlush(user);
	}

	@Transactional
	public StoredFileResponse uploadOrReplaceProfilePhoto(Authentication authentication, MultipartFile file) {
		Users user = requireAuthenticatedUser(authentication);
		Long previousPhotoFileId = user.getProfilePhotoFileId();

		StoredFileResponse stored = fileManagementService.storeGlobalUserFile(
				user.getId(), FileResourceCategory.PROFILE_PHOTO, file,
				RESOURCE_USER_PROFILE_PHOTO, user.getId());

		user.setProfilePhotoFileId(stored.id());
		userRepository.saveAndFlush(user);

		if (previousPhotoFileId != null && !previousPhotoFileId.equals(stored.id())) {
			fileManagementService.detachReference(
					previousPhotoFileId, RESOURCE_USER_PROFILE_PHOTO, user.getId());
		}
		return stored;
	}

	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadProfilePhoto(Authentication authentication) {
		Users user = requireAuthenticatedUser(authentication);
		if (user.getProfilePhotoFileId() == null) {
			throw new EntityNotFoundException("Profile photo not found");
		}
		return fileManagementService.downloadGlobalUserFile(user.getProfilePhotoFileId(), user.getId());
	}

	@Transactional
	public void removeProfilePhoto(Authentication authentication) {
		Users user = requireAuthenticatedUser(authentication);
		Long photoFileId = user.getProfilePhotoFileId();
		if (photoFileId == null) {
			return;
		}
		user.setProfilePhotoFileId(null);
		userRepository.saveAndFlush(user);
		fileManagementService.detachReference(photoFileId, RESOURCE_USER_PROFILE_PHOTO, user.getId());
	}

	public Users requireAuthenticatedUser(Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		return userRepository.findById(userId)
				.orElseThrow(() -> new EntityNotFoundException("User account not found"));
	}

	public UserResponse toEnrichedUserResponse(Users user) {
		List<OrganizationMembership> memberships = membershipRepository.findAllByUserIdOrderByIdAsc(user.getId());
		Set<Long> orgIds = memberships.stream().map(OrganizationMembership::getOrganizationId).collect(Collectors.toSet());
		Map<Long, Organization> orgMap = orgIds.isEmpty() ? Map.of()
				: organizationRepository.findAllById(orgIds).stream()
						.collect(Collectors.toMap(Organization::getId, Function.identity()));

		List<UserOrganizationSummary> orgSummaries = new ArrayList<>();
		for (OrganizationMembership m : memberships) {
			Organization org = orgMap.get(m.getOrganizationId());
			Set<String> roles = authorizationQueryRepository.findOrganizationRoles(user.getId(), m.getOrganizationId());
			Set<String> permissions = authorizationQueryRepository.findOrganizationPermissions(
					user.getId(), m.getOrganizationId());

			OrganizationStatus orgStatus = org != null ? org.getStatus() : null;
			String statusReason = null;
			java.time.Instant statusChangedAt = null;

			if (org != null && (orgStatus == OrganizationStatus.SUSPENDED || orgStatus == OrganizationStatus.DEACTIVATED)) {
				List<OrganizationStatusHistory> history = statusHistoryRepository
						.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(org.getId());
				for (OrganizationStatusHistory h : history) {
					if (h.getNewStatus() == orgStatus) {
						statusReason = h.getReason();
						statusChangedAt = h.getCreatedAt();
						break;
					}
				}
			}

			orgSummaries.add(new UserOrganizationSummary(
					m.getOrganizationId(),
					org != null ? org.getName() : null,
					m.getStatus().name(),
					roles,
					orgStatus,
					statusReason,
					statusChangedAt,
					permissions
			));
		}

		return new UserResponse(
				user.getId(),
				user.getFirstName(),
				user.getLastName(),
				user.getEmail(),
				user.getPhoneNumber(),
				user.getStatus(),
				user.isEmailVerified(),
				user.isPhoneVerified(),
				user.getProfilePhotoFileId(),
				user.getProfilePhotoFileId() != null ? "/api/me/profile-photo" : null,
				orgSummaries,
				user.getCreatedAt(),
				user.getUpdatedAt()
		);
	}

	private String normalizePhone(String phone) {
		String trimmed = phone.trim();
		return trimmed.startsWith("+91") ? trimmed : "+91" + trimmed;
	}
}

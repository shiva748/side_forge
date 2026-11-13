package com.side.forge.user.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.invitation.dto.InvitationDtos.InvitationAcceptanceResponse;
import com.side.forge.invitation.dto.InvitationDtos.InvitationResponse;
import com.side.forge.invitation.entity.InvitationStatus;
import com.side.forge.invitation.service.InvitationService;
import com.side.forge.notification.dto.NotificationDtos.*;
import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationType;
import com.side.forge.notification.service.NotificationDeviceInstallationService;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.user.dto.ChangePasswordRequest;
import com.side.forge.user.dto.UpdateUserProfileRequest;
import com.side.forge.user.dto.UserResponse;
import com.side.forge.user.service.UserService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequiredArgsConstructor
@Tag(name = "User", description = "Authenticated user account, profile, password, profile photo, and notifications operations")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/me")
public class UserController {

	private final UserService userService;
	private final InvitationService invitationService;
	private final NotificationService notificationService;
	private final NotificationDeviceInstallationService deviceInstallationService;

	@Value("${spring.application.token.expiry}")
	private long tokenExpiry;

	@Value("${forge.security.cookie-secure:true}")
	private boolean cookieSecure;

	@GetMapping
	public ResponseEntity<ApiResponse<UserResponse>> myProfile(Authentication authentication) {
		return ResponseEntity.status(HttpStatus.OK)
				.body(new ApiResponse<>(true, "Authenticated", userService.getProfile(authentication)));
	}

	@PutMapping
	public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
			Authentication authentication,
			@Valid @RequestBody UpdateUserProfileRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Profile updated successfully",
				userService.updateProfile(authentication, request)));
	}

	@PatchMapping
	public ResponseEntity<ApiResponse<UserResponse>> patchProfile(
			Authentication authentication,
			@Valid @RequestBody UpdateUserProfileRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Profile updated successfully",
				userService.updateProfile(authentication, request)));
	}

	@PostMapping("/change-password")
	public ResponseEntity<ApiResponse<Void>> changePassword(
			Authentication authentication,
			@Valid @RequestBody ChangePasswordRequest request) {
		userService.changePassword(authentication, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Password changed successfully", null));
	}

	@PutMapping("/password")
	public ResponseEntity<ApiResponse<Void>> updatePassword(
			Authentication authentication,
			@Valid @RequestBody ChangePasswordRequest request) {
		userService.changePassword(authentication, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Password changed successfully", null));
	}

	@PostMapping(value = "/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> uploadProfilePhoto(
			Authentication authentication,
			@RequestParam("file") MultipartFile file) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Profile photo uploaded successfully",
						userService.uploadOrReplaceProfilePhoto(authentication, file)));
	}

	@PutMapping(value = "/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> replaceProfilePhoto(
			Authentication authentication,
			@RequestParam("file") MultipartFile file) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Profile photo updated successfully",
				userService.uploadOrReplaceProfilePhoto(authentication, file)));
	}

	@GetMapping("/profile-photo")
	public ResponseEntity<byte[]> viewProfilePhoto(Authentication authentication) {
		DownloadedFilePayload payload = userService.downloadProfilePhoto(authentication);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION,
						"inline; filename=\"" + payload.metadata().originalFilename() + "\"")
				.contentType(MediaType.parseMediaType(payload.metadata().contentType()))
				.contentLength(payload.content().length)
				.body(payload.content());
	}

	@DeleteMapping("/profile-photo")
	public ResponseEntity<ApiResponse<Void>> deleteProfilePhoto(Authentication authentication) {
		userService.removeProfilePhoto(authentication);
		return ResponseEntity.ok(new ApiResponse<>(true, "Profile photo removed successfully", null));
	}

	@GetMapping("/invitations")
	public ResponseEntity<ApiResponse<List<InvitationResponse>>> myInvitations(
			Authentication authentication,
			@RequestParam(required = false) InvitationStatus status) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Invitations retrieved successfully",
				invitationService.getMyInvitations(authentication, status)));
	}

	@GetMapping("/invitations/{invitationId}")
	public ResponseEntity<ApiResponse<InvitationResponse>> myInvitationById(
			Authentication authentication,
			@PathVariable @Positive Long invitationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Invitation retrieved successfully",
				invitationService.getMyInvitationById(invitationId, authentication)));
	}

	@PostMapping("/invitations/{invitationId}/accept")
	public ResponseEntity<ApiResponse<InvitationAcceptanceResponse>> acceptMyInvitation(
			Authentication authentication,
			@PathVariable @Positive Long invitationId) {
		InvitationAcceptanceResponse accepted = invitationService.acceptMyInvitationById(invitationId, authentication);
		String secureAttr = cookieSecure ? " Secure;" : "";
		return ResponseEntity.ok()
				.header("Set-Cookie",
						String.format("jwt=%s; Path=/; Max-Age=%d; HttpOnly;%s SameSite=Lax",
								accepted.accessToken(), tokenExpiry, secureAttr))
				.body(new ApiResponse<>(true, "Invitation accepted and membership activated successfully", accepted));
	}

	@PostMapping("/invitations/{invitationId}/reject")
	public ResponseEntity<ApiResponse<InvitationResponse>> rejectMyInvitation(
			Authentication authentication,
			@PathVariable @Positive Long invitationId) {
		InvitationResponse rejected = invitationService.rejectMyInvitationById(invitationId, authentication);
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitation declined successfully", rejected));
	}

	@GetMapping("/notifications")
	public ResponseEntity<ApiResponse<PagedResponse<NotificationResponse>>> myNotifications(
			Authentication authentication,
			@RequestParam(required = false) NotificationCategory category,
			@RequestParam(required = false) NotificationType type,
			@RequestParam(required = false) Boolean unreadOnly,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notifications retrieved successfully",
				notificationService.getUserNotifications(userId, null, category, type, unreadOnly, page, size)));
	}

	@GetMapping("/notifications/unread-count")
	public ResponseEntity<ApiResponse<UnreadNotificationCountResponse>> myUnreadNotificationCount(
			Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Unread notification count retrieved successfully",
				notificationService.getUnreadCount(userId, null)));
	}

	@PatchMapping("/notifications/{notificationId}/read")
	public ResponseEntity<ApiResponse<NotificationResponse>> markMyNotificationRead(
			Authentication authentication,
			@PathVariable @Positive Long notificationId) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification marked as read",
				notificationService.markAsRead(userId, null, notificationId)));
	}

	@PostMapping("/notifications/read-all")
	public ResponseEntity<ApiResponse<MarkAllReadResponse>> markAllMyNotificationsRead(
			Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "All notifications marked as read",
				notificationService.markAllAsRead(userId, null)));
	}

	@GetMapping("/notification-preferences")
	public ResponseEntity<ApiResponse<NotificationPreferenceResponse>> myNotificationPreferences(
			Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification preferences retrieved successfully",
				notificationService.getUserPreferences(userId, null)));
	}

	@PutMapping("/notification-preferences")
	public ResponseEntity<ApiResponse<NotificationPreferenceResponse>> updateMyNotificationPreferences(
			Authentication authentication,
			@Valid @RequestBody UpdateNotificationPreferencesRequest request) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification preferences updated successfully",
				notificationService.updateUserPreferences(userId, null, request)));
	}

	@PostMapping("/device-installations")
	public ResponseEntity<ApiResponse<DeviceInstallationResponse>> registerMyDeviceInstallation(
			Authentication authentication,
			@Valid @RequestBody RegisterDeviceInstallationRequest request) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Device installation registered successfully",
				deviceInstallationService.registerOrUpdateInstallation(userId, request)));
	}

	@GetMapping("/device-installations")
	public ResponseEntity<ApiResponse<List<DeviceInstallationResponse>>> getMyDeviceInstallations(
			Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Device installations retrieved successfully",
				deviceInstallationService.getActiveInstallationsForUser(userId)));
	}

	@DeleteMapping("/device-installations/{installationId}")
	public ResponseEntity<ApiResponse<Void>> deactivateMyDeviceInstallation(
			Authentication authentication,
			@PathVariable String installationId) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		deviceInstallationService.deactivateInstallation(userId, installationId);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Device installation deactivated successfully", null));
	}

	@PostMapping("/notifications/{notificationId}/delivery-ack")
	public ResponseEntity<ApiResponse<Void>> acknowledgeMyNotificationDelivery(
			Authentication authentication,
			@PathVariable @Positive Long notificationId,
			@Valid @RequestBody NotificationDeliveryAckRequest request) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		deviceInstallationService.acknowledgeDelivery(userId, notificationId, request);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification delivery acknowledged", null));
	}
}


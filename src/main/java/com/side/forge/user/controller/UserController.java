package com.side.forge.user.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.invitation.dto.InvitationDtos.InvitationResponse;
import com.side.forge.invitation.service.InvitationService;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.user.dto.ChangePasswordRequest;
import com.side.forge.user.dto.UpdateUserProfileRequest;
import com.side.forge.user.dto.UserResponse;
import com.side.forge.user.service.UserService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequiredArgsConstructor
@Tag(name = "User", description = "Authenticated user account, profile, password, and profile photo operations")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/me")
public class UserController {

	private final UserService userService;
	private final InvitationService invitationService;

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
	public ResponseEntity<ApiResponse<List<InvitationResponse>>> myPendingInvitations(Authentication authentication) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Pending invitations retrieved successfully",
				invitationService.getMyPendingInvitations(authentication)));
	}
}


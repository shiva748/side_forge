package com.side.forge.invitation.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.invitation.dto.InvitationDtos.CreateInvitationRequest;
import com.side.forge.invitation.dto.InvitationDtos.InvitationDispatchResponse;
import com.side.forge.invitation.dto.InvitationDtos.InvitationResponse;
import com.side.forge.invitation.service.InvitationService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Platform Organization Invitations", description = "Platform management of initial and additional School Admin invitations")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/platform/organizations/{organizationId}/invitations")
@RequiredArgsConstructor
public class PlatformInvitationController {

	private final InvitationService invitationService;

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<InvitationDispatchResponse>> createSchoolAdminInvitation(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateInvitationRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "School administrator invitation dispatched successfully",
						invitationService.createPlatformSchoolAdminInvitation(organizationId, request)));
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@GetMapping
	public ResponseEntity<ApiResponse<List<InvitationResponse>>> getOrganizationInvitations(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization invitations retrieved successfully",
				invitationService.getPlatformOrganizationInvitations(organizationId)));
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@PostMapping("/{invitationId}/resend")
	public ResponseEntity<ApiResponse<InvitationDispatchResponse>> resendInvitation(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long invitationId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitation resent successfully",
				invitationService.resendPlatformInvitation(organizationId, invitationId)));
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@PostMapping("/{invitationId}/revoke")
	public ResponseEntity<ApiResponse<InvitationResponse>> revokeInvitation(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long invitationId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitation revoked successfully",
				invitationService.revokePlatformInvitation(organizationId, invitationId)));
	}
}

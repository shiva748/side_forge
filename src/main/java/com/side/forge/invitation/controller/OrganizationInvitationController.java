package com.side.forge.invitation.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.invitation.dto.InvitationDtos.CreateInvitationRequest;
import com.side.forge.invitation.dto.InvitationDtos.InvitationDispatchResponse;
import com.side.forge.invitation.dto.InvitationDtos.InvitationResponse;
import com.side.forge.invitation.entity.InvitationStatus;
import com.side.forge.invitation.entity.InvitationTargetType;
import com.side.forge.invitation.service.InvitationService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Organization Invitations", description = "Create, list, resend, and revoke organization invitations")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/invitations")
@RequiredArgsConstructor
public class OrganizationInvitationController {

	private final InvitationService invitationService;

	@PostMapping
	public ResponseEntity<ApiResponse<InvitationDispatchResponse>> createInvitation(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateInvitationRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Invitation created and dispatched successfully",
						invitationService.createOrganizationInvitation(organizationId, request)));
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<InvitationResponse>>> getInvitations(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) InvitationStatus status,
			@RequestParam(required = false) String roleCode,
			@RequestParam(required = false) InvitationTargetType targetType) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitations retrieved successfully",
				invitationService.getOrganizationInvitations(organizationId, status, roleCode, targetType)));
	}

	@GetMapping("/{invitationId}")
	public ResponseEntity<ApiResponse<InvitationResponse>> getInvitationById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long invitationId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitation retrieved successfully",
				invitationService.getOrganizationInvitationById(organizationId, invitationId)));
	}

	@PostMapping("/{invitationId}/resend")
	public ResponseEntity<ApiResponse<InvitationDispatchResponse>> resendInvitation(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long invitationId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitation resent successfully",
				invitationService.resendOrganizationInvitation(organizationId, invitationId)));
	}

	@PostMapping("/{invitationId}/revoke")
	public ResponseEntity<ApiResponse<InvitationResponse>> revokeInvitation(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long invitationId) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Invitation revoked successfully",
				invitationService.revokeOrganizationInvitation(organizationId, invitationId)));
	}
}

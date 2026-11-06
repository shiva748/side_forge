package com.side.forge.invitation.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.invitation.dto.InvitationDtos.AcceptInvitationRequest;
import com.side.forge.invitation.dto.InvitationDtos.InvitationAcceptanceResponse;
import com.side.forge.invitation.dto.InvitationDtos.InvitationVerificationResponse;
import com.side.forge.invitation.service.InvitationService;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Invitation Acceptance", description = "Verify invitation links and accept invitations to activate organization membership")
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationAcceptanceController {

	private final InvitationService invitationService;

	@Value("${spring.application.token.expiry}")
	private long tokenExpiry;

	@GetMapping("/verify")
	public ResponseEntity<ApiResponse<InvitationVerificationResponse>> verifyInvitation(
			@RequestParam @NotBlank String token) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Invitation verified successfully",
				invitationService.verifyInvitationToken(token)));
	}

	@PostMapping("/accept")
	public ResponseEntity<ApiResponse<InvitationAcceptanceResponse>> acceptInvitation(
			@Valid @RequestBody AcceptInvitationRequest request,
			Authentication authentication) {
		InvitationAcceptanceResponse accepted = invitationService.acceptInvitation(request, authentication);
		return ResponseEntity.ok()
				.header("Set-Cookie",
						String.format("jwt=%s; Path=/; Max-Age=%d; HttpOnly; Secure; SameSite=Lax",
								accepted.accessToken(), tokenExpiry))
				.body(new ApiResponse<>(true, "Invitation accepted and membership activated successfully", accepted));
	}
}

package com.side.forge.invitation.dto;

import java.time.Instant;

import com.side.forge.invitation.entity.InvitationStatus;
import com.side.forge.invitation.entity.InvitationTargetType;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class InvitationDtos {

	private InvitationDtos() {
	}

	public record CreateInvitationRequest(
			@NotBlank(message = "Recipient email is required")
			@Email(message = "Invalid email address")
			@Size(max = 255)
			String email,

			@NotBlank(message = "Role code is required")
			@Size(max = 100)
			String roleCode,

			InvitationTargetType targetType,

			@Positive
			Long targetProfileId,

			@Size(max = 100)
			String firstName,

			@Size(max = 100)
			String lastName,

			@Pattern(
					regexp = "^(\\+91)?[6-9]\\d{9}$",
					message = "Enter a valid 10-digit Indian mobile number"
			)
			String phoneNumber,

			@Min(value = 1, message = "Expiry hours must be at least 1")
			@Max(value = 720, message = "Expiry hours must not exceed 720")
			Integer expiryHours
	) {
	}

	public record AcceptInvitationRequest(
			@NotBlank(message = "Invitation token is required")
			String token,

			@Email(message = "Invalid email address")
			@Size(max = 255)
			String email,

			@Size(max = 100)
			String firstName,

			@Size(max = 100)
			String lastName,

			@Pattern(
					regexp = "^(\\+91)?[6-9]\\d{9}$",
					message = "Enter a valid 10-digit Indian mobile number"
			)
			String phoneNumber,

			@Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
			String password
	) {
	}

	public record RejectInvitationRequest(
			@NotBlank(message = "Invitation token is required")
			String token,

			@Email(message = "Invalid email address")
			@Size(max = 255)
			String email
	) {
	}

	public record InvitationResponse(
			Long id,
			Long organizationId,
			String organizationName,
			String email,
			String roleCode,
			InvitationTargetType targetType,
			Long targetProfileId,
			String recipientFirstName,
			String recipientLastName,
			String recipientPhone,
			InvitationStatus status,
			Instant expiresAt,
			Long invitedByUserId,
			String invitedByName,
			Long onboardingRequestId,
			int resendCount,
			Instant lastSentAt,
			Long acceptedByUserId,
			Instant acceptedAt,
			Long revokedByUserId,
			Instant revokedAt,
			Instant createdAt
	) {
	}

	public record InvitationDispatchResponse(
			InvitationResponse invitation,
			String invitationLink,
			String invitationToken
	) {
	}

	public record InvitationVerificationResponse(
			Long invitationId,
			Long organizationId,
			String organizationName,
			String email,
			String roleCode,
			InvitationTargetType targetType,
			Long targetProfileId,
			String recipientFirstName,
			String recipientLastName,
			String recipientPhone,
			boolean existingUserAccount,
			InvitationStatus status,
			Instant expiresAt
	) {
	}

	public record InvitationAcceptanceResponse(
			InvitationResponse invitation,
			Long userId,
			String email,
			Long organizationId,
			String roleCode,
			String membershipStatus,
			Long linkedProfileId,
			String accessToken
	) {
	}
}

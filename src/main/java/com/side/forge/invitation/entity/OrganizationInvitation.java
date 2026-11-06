package com.side.forge.invitation.entity;

import java.time.Instant;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "organization_invitations",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_org_invitations_token_hash", columnNames = {"token_hash"}),
				@UniqueConstraint(name = "uk_org_invitations_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_org_inv_org_email_status", columnList = "organization_id, email, status"),
				@Index(name = "idx_org_inv_email_status", columnList = "email, status")
		}
)
@Getter
@Setter
public class OrganizationInvitation extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false, length = 255)
	private String email;

	@Column(name = "role_code", nullable = false, length = 100)
	private String roleCode;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 40)
	private InvitationTargetType targetType;

	@Column(name = "target_profile_id")
	private Long targetProfileId;

	@Column(name = "recipient_first_name", length = 100)
	private String recipientFirstName;

	@Column(name = "recipient_last_name", length = 100)
	private String recipientLastName;

	@Column(name = "recipient_phone", length = 20)
	private String recipientPhone;

	@Column(name = "token_hash", nullable = false, length = 64)
	private String tokenHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InvitationStatus status = InvitationStatus.PENDING;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "invited_by_user_id", nullable = false)
	private Long invitedByUserId;

	@Column(name = "onboarding_request_id")
	private Long onboardingRequestId;

	@Column(name = "resend_count", nullable = false)
	private int resendCount = 0;

	@Column(name = "last_sent_at", nullable = false)
	private Instant lastSentAt;

	@Column(name = "accepted_by_user_id")
	private Long acceptedByUserId;

	@Column(name = "accepted_at")
	private Instant acceptedAt;

	@Column(name = "revoked_by_user_id")
	private Long revokedByUserId;

	@Column(name = "revoked_at")
	private Instant revokedAt;
}

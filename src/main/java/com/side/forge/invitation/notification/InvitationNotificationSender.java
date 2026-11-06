package com.side.forge.invitation.notification;

import java.time.Instant;

import com.side.forge.invitation.entity.InvitationTargetType;

/**
 * Integration point for invitation email/notification delivery.
 * Can be backed by an SMTP/SES mail sender in production without changing
 * invitation domain logic.
 */
public interface InvitationNotificationSender {

	record InvitationNotificationPayload(
			Long invitationId,
			Long organizationId,
			String organizationName,
			String recipientEmail,
			String recipientFirstName,
			String roleCode,
			InvitationTargetType targetType,
			String invitationToken,
			String invitationLink,
			Instant expiresAt
	) {
	}

	void sendInvitation(InvitationNotificationPayload payload);
}

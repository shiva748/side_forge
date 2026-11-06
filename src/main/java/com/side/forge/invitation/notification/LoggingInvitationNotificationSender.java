package com.side.forge.invitation.notification;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@ConditionalOnMissingBean(name = "customInvitationNotificationSender")
public class LoggingInvitationNotificationSender implements InvitationNotificationSender {

	private final Map<Long, InvitationNotificationPayload> byInvitationId = new ConcurrentHashMap<>();
	private final Map<String, InvitationNotificationPayload> byOrgAndEmail = new ConcurrentHashMap<>();

	@Override
	public void sendInvitation(InvitationNotificationPayload payload) {
		byInvitationId.put(payload.invitationId(), payload);
		byOrgAndEmail.put(payload.organizationId() + ":" + payload.recipientEmail().toLowerCase(), payload);
		log.info("Dispatched organization invitation [id={}, orgId={}, email={}, role={}, expiresAt={}]",
				payload.invitationId(), payload.organizationId(), payload.recipientEmail(),
				payload.roleCode(), payload.expiresAt());
	}

	public Optional<InvitationNotificationPayload> getLastDispatchedByInvitationId(Long invitationId) {
		return Optional.ofNullable(byInvitationId.get(invitationId));
	}

	public Optional<InvitationNotificationPayload> getLastDispatchedForOrgAndEmail(Long orgId, String email) {
		if (orgId == null || email == null) {
			return Optional.empty();
		}
		return Optional.ofNullable(byOrgAndEmail.get(orgId + ":" + email.trim().toLowerCase()));
	}
}

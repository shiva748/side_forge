package com.side.forge.notification.push;

public record PushSendResult(
		boolean delivered,
		boolean permanentTokenFailure,
		String providerMessageId,
		String errorCode,
		String errorMessage
) {
	public static PushSendResult success(String providerMessageId) {
		return new PushSendResult(true, false, providerMessageId, null, null);
	}

	public static PushSendResult failure(boolean permanentTokenFailure, String errorCode, String errorMessage) {
		return new PushSendResult(false, permanentTokenFailure, null, errorCode, errorMessage);
	}
}

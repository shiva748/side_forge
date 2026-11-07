package com.side.forge.platform.saas.exception;

import org.springframework.security.access.AccessDeniedException;

public class SubscriptionAccessException extends AccessDeniedException {

	public SubscriptionAccessException(String message) {
		super(message);
	}
}

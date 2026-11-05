package com.side.forge.common.utils;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

public class AuthenticationUtils {
	public static Long getAuthenticatedUserId(Authentication authentication) {
		if (authentication == null || !authentication.isAuthenticated()
				|| authentication instanceof AnonymousAuthenticationToken) {
			return null;
		}

		// Replace this with your actual principal type/property.
		return Long.valueOf(authentication.getName());
	}
}

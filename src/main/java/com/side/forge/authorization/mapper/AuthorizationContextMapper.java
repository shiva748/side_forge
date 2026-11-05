package com.side.forge.authorization.mapper;

import java.util.Set;

import com.side.forge.authorization.dto.AuthorizationContext;

public final class AuthorizationContextMapper {
	private AuthorizationContextMapper() {
	}

	public static AuthorizationContext organization(Long userId, Long organizationId, Set<String> roles,
			Set<String> permissions) {
		return new AuthorizationContext(userId, organizationId, roles, permissions, false);
	}

	public static AuthorizationContext platform(Long userId, Set<String> roles, Set<String> permissions) {
		return new AuthorizationContext(userId, null, roles, permissions, true);
	}
}

package com.side.forge.authorization.dto;

import java.util.Set;

public record AuthorizationContext(Long userId, Long organizationId, Set<String> roles, Set<String> permissions,
		boolean platformContext) {
	public AuthorizationContext {
		roles = Set.copyOf(roles);
		permissions = Set.copyOf(permissions);
	}

	public boolean hasRole(String role) {
		return roles.contains(role);
	}
	public boolean hasPermission(String permission) {
		return permissions.contains(permission);
	}
}

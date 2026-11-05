package com.side.forge.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.side.forge.authorization.api.AuthorizationApi;
import com.side.forge.authorization.dto.AuthorizationContext;
import com.side.forge.authorization.service.CurrentUserContext;

@Component
public class SecurityContextCurrentUser implements AuthorizationApi, CurrentUserContext {

	private AuthorizationContext context() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getDetails() instanceof AuthorizationContext context)) {
			throw new AccessDeniedException("Authorization context is not available for this request");
		}
		return context;
	}

	@Override
	public boolean hasRole(String role) {
		return context().hasRole(role);
	}

	@Override
	public Long currentUserId() {
		return context().userId();
	}

	@Override
	public Long getUserId() {
		return currentUserId();
	}

	@Override
	public Long currentOrganizationId() {
		return context().organizationId();
	}

	@Override
	public Long getOrganizationId() {
		return currentOrganizationId();
	}

	@Override
	public boolean hasPermission(String permission) {
		return context().hasPermission(permission);
	}

	@Override
	public boolean isPlatformContext() {
		return context().platformContext();
	}
}

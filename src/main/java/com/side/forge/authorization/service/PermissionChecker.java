package com.side.forge.authorization.service;

import java.util.Objects;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.side.forge.authorization.enums.PermissionCode;

@Component("permissionChecker")
public class PermissionChecker {

	public boolean hasPermission(PermissionCode permission) {
		return permission != null && hasPermissionByName(permission.getValue());
	}

	public boolean hasPermissionByName(String permission) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		if (authentication == null || !authentication.isAuthenticated()
				|| authentication instanceof AnonymousAuthenticationToken || permission == null
				|| permission.isBlank()) {
			return false;
		}

		return authentication.getAuthorities().stream()
				.anyMatch(authority -> Objects.equals(authority.getAuthority(), permission));
	}
}

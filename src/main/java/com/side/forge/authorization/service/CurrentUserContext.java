package com.side.forge.authorization.service;

public interface CurrentUserContext {
	Long getUserId();
	Long getOrganizationId();
	boolean isPlatformContext();
	boolean hasPermission(String permission);
	boolean hasRole(String role);
}

package com.side.forge.authorization.api;

public interface AuthorizationApi {
	Long currentUserId();
	Long currentOrganizationId();
	boolean hasPermission(String permission);
	boolean isPlatformContext();
}

package com.side.forge.authorization.service;

import com.side.forge.authorization.dto.AuthorizationContext;

public interface AuthorizationContextService {
	AuthorizationContext resolveOrganization(Long userId, Long organizationId);
	AuthorizationContext resolvePlatform(Long userId);
}

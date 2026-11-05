package com.side.forge.authorization.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.side.forge.authorization.dto.AuthorizationContext;
import com.side.forge.authorization.mapper.AuthorizationContextMapper;
import com.side.forge.authorization.repository.AuthorizationQueryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthorizationContextServiceImpl implements AuthorizationContextService {
	private final AuthorizationQueryRepository queryRepository;

	@Override
	public AuthorizationContext resolveOrganization(Long userId, Long organizationId) {
		if (!queryRepository.hasActiveMembership(userId, organizationId)) {
			throw new AccessDeniedException("No active membership in the requested organization");
		}
		return AuthorizationContextMapper.organization(userId, organizationId,
				queryRepository.findOrganizationRoles(userId, organizationId),
				queryRepository.findOrganizationPermissions(userId, organizationId));
	}

	@Override
	public AuthorizationContext resolvePlatform(Long userId) {
		return AuthorizationContextMapper.platform(userId, queryRepository.findPlatformRoles(userId),
				queryRepository.findPlatformPermissions(userId));
	}
}

package com.side.forge.authorization.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.repository.AuthorizationAuditLogRepository;
import com.side.forge.authorization.repository.MembershipRoleRepository;
import com.side.forge.authorization.repository.OrganizationMembershipRepository;
import com.side.forge.authorization.repository.RoleRepository;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Creates the initial school administrator membership when an authenticated
 * user submitted the onboarding request and the platform approves it.
 */
@Service
@RequiredArgsConstructor
public class OrganizationAdminProvisioningService {

	private final CurrentUserContext currentUser;
	private final UserRepository userRepository;
	private final OrganizationRepository organizationRepository;
	private final RoleRepository roleRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final MembershipRoleRepository membershipRoleRepository;
	private final AuthorizationAuditLogRepository auditLogRepository;

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public void provisionInitialSchoolAdmin(Long targetUserId, Long organizationId) {
		if (!currentUser.isPlatformContext()) {
			throw new AccessDeniedException("Platform context is required to provision a school administrator");
		}
		if (!userRepository.existsById(targetUserId) || !organizationRepository.existsById(organizationId)) {
			throw new IllegalArgumentException("Onboarding applicant or organization was not found");
		}

		Role schoolAdminRole = roleRepository
				.findByCodeAndScopeAndOrganizationId("SCHOOL_ADMIN", RoleScope.ORGANIZATION, null)
				.orElseThrow(() -> new IllegalStateException(
						"SCHOOL_ADMIN role is missing. Run the authorization seed SQL first."));

		OrganizationMembership membership = membershipRepository
				.findByUserIdAndOrganizationId(targetUserId, organizationId).orElseGet(
						() -> membershipRepository.save(OrganizationMembership.active(targetUserId, organizationId)));

		if (membership.getStatus() != MembershipStatus.ACTIVE) {
			membership.changeStatus(MembershipStatus.ACTIVE);
		}

		if (membershipRoleRepository.findByMembershipIdAndRoleId(membership.getId(), schoolAdminRole.getId())
				.isEmpty()) {
			membershipRoleRepository
					.save(new MembershipRole(membership.getId(), schoolAdminRole.getId(), currentUser.getUserId()));
			auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, organizationId,
					schoolAdminRole.getCode(), AuthorizationAuditLog.Action.ORGANIZATION_ROLE_ASSIGNED));
		}

	}
}

package com.side.forge.authorization.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.repository.*;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoleAssignmentService {

	private final RoleRepository roleRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final MembershipRoleRepository membershipRoleRepository;
	private final PlatformUserRoleRepository platformUserRoleRepository;
	private final AuthorizationAuditLogRepository auditLogRepository;
	private final AuthorizationQueryRepository authorizationQueryRepository;
	private final UserRepository userRepository;
	private final OrganizationRepository organizationRepository;
	private final CurrentUserContext currentUser;

	/**
	 * Only an active SCHOOL_ADMIN in the same organization can assign an
	 * organization role. The actor ID is always taken from the authenticated
	 * context.
	 */
	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void assignOrganizationRole(Long targetUserId, Long organizationId, String roleCode) {
		requireOrganizationAdmin(organizationId);
		validateTargetAndOrganization(targetUserId, organizationId);

		Role role = findOrganizationRole(roleCode, organizationId);
		OrganizationMembership membership = membershipRepository
				.findByUserIdAndOrganizationId(targetUserId, organizationId).orElseGet(
						() -> membershipRepository.save(OrganizationMembership.active(targetUserId, organizationId)));

		if (membership.getStatus() != MembershipStatus.ACTIVE) {
			throw new IllegalStateException("Cannot assign a role to an inactive membership");
		}

		boolean alreadyAssigned = membershipRoleRepository.findByMembershipIdAndRoleId(membership.getId(), role.getId())
				.isPresent();

		if (!alreadyAssigned) {
			membershipRoleRepository
					.save(new MembershipRole(membership.getId(), role.getId(), currentUser.getUserId()));
			auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, organizationId,
					role.getCode(), AuthorizationAuditLog.Action.ORGANIZATION_ROLE_ASSIGNED));
		}

	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void revokeOrganizationRole(Long targetUserId, Long organizationId, String roleCode) {
		requireOrganizationAdmin(organizationId);
		Role role = findOrganizationRole(roleCode, organizationId);

		OrganizationMembership membership = membershipRepository
				.findByUserIdAndOrganizationIdAndStatus(targetUserId, organizationId, MembershipStatus.ACTIVE)
				.orElseThrow(() -> new IllegalArgumentException("Active organization membership not found"));

		if ("SCHOOL_ADMIN".equals(role.getCode()) && authorizationQueryRepository
				.countActiveOrganizationRoleAssignments(organizationId, role.getId()) <= 1) {
			throw new IllegalStateException("Cannot revoke the last SCHOOL_ADMIN role in this organization");
		}

		if (membershipRoleRepository.findByMembershipIdAndRoleId(membership.getId(), role.getId()).isPresent()) {
			membershipRoleRepository.deleteByMembershipIdAndRoleId(membership.getId(), role.getId());
			auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, organizationId,
					role.getCode(), AuthorizationAuditLog.Action.ORGANIZATION_ROLE_REVOKED));
		}

	}

	/**
	 * Platform roles can only be assigned in a platform context by a caller holding
	 * platform.role.manage. School administrators cannot call this.
	 */
	@RequirePermission(PermissionCode.PLATFORM_ROLE_MANAGE)
	@Transactional
	public void assignPlatformRole(Long targetUserId, String roleCode) {
		requirePlatformContext();
		if (!userRepository.existsById(targetUserId)) {
			throw new IllegalArgumentException("Target user not found");
		}

		Role role = roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.PLATFORM, null)
				.orElseThrow(() -> new IllegalArgumentException("Platform role not found"));

		if (platformUserRoleRepository.findByUserIdAndRoleId(targetUserId, role.getId()).isEmpty()) {
			platformUserRoleRepository.save(new PlatformUserRole(targetUserId, role.getId(), currentUser.getUserId()));
			auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, null,
					role.getCode(), AuthorizationAuditLog.Action.PLATFORM_ROLE_ASSIGNED));
		}

	}

	@RequirePermission(PermissionCode.PLATFORM_ROLE_MANAGE)
	@Transactional
	public void revokePlatformRole(Long targetUserId, String roleCode) {
		requirePlatformContext();
		Role role = roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.PLATFORM, null)
				.orElseThrow(() -> new IllegalArgumentException("Platform role not found"));

		boolean assigned = platformUserRoleRepository.findByUserIdAndRoleId(targetUserId, role.getId()).isPresent();
		if (assigned && "SYSTEM_ADMIN".equals(role.getCode())
				&& platformUserRoleRepository.countByRoleId(role.getId()) <= 1) {
			throw new IllegalStateException("Cannot revoke the last SYSTEM_ADMIN role");
		}

		if (assigned) {
			platformUserRoleRepository.deleteByUserIdAndRoleId(targetUserId, role.getId());
			auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, null,
					role.getCode(), AuthorizationAuditLog.Action.PLATFORM_ROLE_REVOKED));
		}

	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void suspendMembership(Long targetUserId, Long organizationId) {
		requireOrganizationAdmin(organizationId);
		OrganizationMembership membership = membershipRepository
				.findByUserIdAndOrganizationId(targetUserId, organizationId)
				.orElseThrow(() -> new IllegalArgumentException("Organization membership not found"));

		if (membership.getStatus() == MembershipStatus.ACTIVE) {
			Role schoolAdminRole = findOrganizationRole("SCHOOL_ADMIN", organizationId);
			boolean isSchoolAdmin = membershipRoleRepository
					.findByMembershipIdAndRoleId(membership.getId(), schoolAdminRole.getId()).isPresent();
			long activeSchoolAdmins = authorizationQueryRepository
					.countActiveOrganizationRoleAssignments(organizationId, schoolAdminRole.getId());
			if (isSchoolAdmin && activeSchoolAdmins <= 1) {
				throw new IllegalStateException("Cannot suspend the last active SCHOOL_ADMIN in this organization");
			}
		}
		membership.changeStatus(MembershipStatus.SUSPENDED);
		auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, organizationId,
				"MEMBERSHIP", AuthorizationAuditLog.Action.MEMBERSHIP_SUSPENDED));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void activateMembership(Long targetUserId, Long organizationId) {
		requireOrganizationAdmin(organizationId);
		OrganizationMembership membership = membershipRepository
				.findByUserIdAndOrganizationId(targetUserId, organizationId)
				.orElseThrow(() -> new IllegalArgumentException("Organization membership not found"));

		membership.changeStatus(MembershipStatus.ACTIVE);
		auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, organizationId,
				"MEMBERSHIP", AuthorizationAuditLog.Action.MEMBERSHIP_ACTIVATED));
	}

	private void requireOrganizationAdmin(Long organizationId) {
		if (currentUser.isPlatformContext() || currentUser.getOrganizationId() == null
				|| !currentUser.getOrganizationId().equals(organizationId) || !currentUser.hasRole("SCHOOL_ADMIN")) {
			throw new AccessDeniedException("Only a school administrator can manage memberships in this school");
		}
	}

	private void requirePlatformContext() {
		if (!currentUser.isPlatformContext()) {
			throw new AccessDeniedException("A platform authorization context is required");
		}
	}

	private void validateTargetAndOrganization(Long targetUserId, Long organizationId) {
		if (!userRepository.existsById(targetUserId)) {
			throw new IllegalArgumentException("Target user not found");
		}
		if (!organizationRepository.existsById(organizationId)) {
			throw new IllegalArgumentException("Organization not found");
		}
	}

	private Role findOrganizationRole(String roleCode, Long organizationId) {
		return roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.ORGANIZATION, organizationId)
				.or(() -> roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.ORGANIZATION, null))
				.orElseThrow(() -> new IllegalArgumentException("Organization role not found"));
	}

}

package com.side.forge.authorization.service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.repository.*;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoleAssignmentService {

	public record OrganizationRoleDto(
			Long id,
			String code,
			String name,
			String description,
			Long organizationId,
			boolean systemDefined,
			Set<String> permissions
	) {
	}

	public record PermissionDto(
			String code,
			String name,
			String module,
			String description
	) {
	}

	public record CreateCustomRoleRequest(
			@NotBlank @Size(max = 100) String code,
			@NotBlank @Size(max = 100) String name,
			@Size(max = 255) String description,
			@NotEmpty Set<String> permissions
	) {
	}

	public record UpdateCustomRoleRequest(
			@NotBlank @Size(max = 100) String name,
			@Size(max = 255) String description,
			@NotEmpty Set<String> permissions
	) {
	}

	public record OrganizationMemberSummaryDto(
			Long membershipId,
			Long userId,
			String firstName,
			String lastName,
			String email,
			String phoneNumber,
			MembershipStatus status,
			Set<String> roles
	) {
	}

	private final RoleRepository roleRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final MembershipRoleRepository membershipRoleRepository;
	private final PlatformUserRoleRepository platformUserRoleRepository;
	private final AuthorizationAuditLogRepository auditLogRepository;
	private final AuthorizationQueryRepository authorizationQueryRepository;
	private final UserRepository userRepository;
	private final OrganizationRepository organizationRepository;
	private final CurrentUserContext currentUser;
	private final NotificationService notificationService;
	private final NamedParameterJdbcTemplate jdbc;

	/**
	 * Only an active SCHOOL_ADMIN in the same organization can assign an
	 * organization role. The actor ID is always taken from the authenticated
	 * context.
	 */
	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void assignOrganizationRole(Long targetUserId, Long organizationId, String roleCode) {
		requireOrganizationAdmin(organizationId);
		if (targetUserId != null && targetUserId.equals(currentUser.getUserId())) {
			throw new AccessDeniedException("Users cannot grant additional roles to themselves");
		}
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
			notificationService.notifyOrganizationRoleChanged(organizationId, targetUserId, role.getCode(), true);
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
			notificationService.notifyOrganizationRoleChanged(organizationId, targetUserId, role.getCode(), false);
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

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void revokeMembership(Long targetUserId, Long organizationId) {
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
				throw new IllegalStateException("Cannot revoke the last active SCHOOL_ADMIN in this organization");
			}
		}
		membership.changeStatus(MembershipStatus.LEFT);
		auditLogRepository.save(new AuthorizationAuditLog(currentUser.getUserId(), targetUserId, organizationId,
				"MEMBERSHIP", AuthorizationAuditLog.Action.MEMBERSHIP_SUSPENDED));
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public List<OrganizationRoleDto> listOrganizationRoles(Long organizationId) {
		verifySameOrganizationContext(organizationId);
		List<Role> roles = roleRepository.findAll().stream()
				.filter(r -> r.getScope() == RoleScope.ORGANIZATION
						&& (r.getOrganizationId() == null || organizationId.equals(r.getOrganizationId())))
				.sorted(Comparator.comparing(Role::isSystemDefined).reversed().thenComparing(Role::getCode))
				.toList();
		return roles.stream()
				.map(r -> new OrganizationRoleDto(
						r.getId(),
						r.getCode(),
						r.getName(),
						r.getDescription(),
						r.getOrganizationId(),
						r.isSystemDefined(),
						authorizationQueryRepository.findPermissionsForRole(r.getId())))
				.toList();
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public List<PermissionDto> listOrganizationPermissions(Long organizationId) {
		verifySameOrganizationContext(organizationId);
		return jdbc.query(
				"SELECT code, name, module, description FROM permissions WHERE module <> 'PLATFORM' ORDER BY module ASC, code ASC",
				Map.of(),
				(rs, rowNum) -> new PermissionDto(
						rs.getString("code"),
						rs.getString("name"),
						rs.getString("module"),
						rs.getString("description")));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public OrganizationRoleDto createCustomOrganizationRole(Long organizationId, CreateCustomRoleRequest request) {
		requireOrganizationAdmin(organizationId);
		String code = request.code().trim().toUpperCase(Locale.ROOT);
		if (roleRepository.findByCodeAndScopeAndOrganizationId(code, RoleScope.ORGANIZATION, null).isPresent()
				|| roleRepository.findByCodeAndScopeAndOrganizationId(code, RoleScope.ORGANIZATION, organizationId).isPresent()
				|| roleRepository.findByCodeAndScopeAndOrganizationId(code, RoleScope.PLATFORM, null).isPresent()) {
			throw new IllegalStateException("Role code already exists: " + code);
		}

		Map<String, Long> permissionIdsByCode = validateAndResolveAssignablePermissions(organizationId, request.permissions());
		Role role = Role.customOrganizationRole(
				organizationId,
				code,
				request.name().trim(),
				request.description() != null ? request.description().trim() : null);
		Role saved = roleRepository.saveAndFlush(role);
		syncRolePermissions(saved.getId(), permissionIdsByCode.values());

		return new OrganizationRoleDto(
				saved.getId(),
				saved.getCode(),
				saved.getName(),
				saved.getDescription(),
				saved.getOrganizationId(),
				saved.isSystemDefined(),
				Set.copyOf(permissionIdsByCode.keySet()));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public OrganizationRoleDto updateCustomOrganizationRole(
			Long organizationId, Long roleId, UpdateCustomRoleRequest request) {
		requireOrganizationAdmin(organizationId);
		Role role = roleRepository.findById(roleId)
				.orElseThrow(() -> new EntityNotFoundException("Role not found"));
		if (role.isSystemDefined() || role.getScope() != RoleScope.ORGANIZATION
				|| !organizationId.equals(role.getOrganizationId())) {
			throw new AccessDeniedException("Only custom roles owned by this organization can be modified");
		}

		Map<String, Long> permissionIdsByCode = validateAndResolveAssignablePermissions(organizationId, request.permissions());
		role.updateDetails(
				request.name().trim(),
				request.description() != null ? request.description().trim() : null);
		Role saved = roleRepository.saveAndFlush(role);
		syncRolePermissions(saved.getId(), permissionIdsByCode.values());

		return new OrganizationRoleDto(
				saved.getId(),
				saved.getCode(),
				saved.getName(),
				saved.getDescription(),
				saved.getOrganizationId(),
				saved.isSystemDefined(),
				Set.copyOf(permissionIdsByCode.keySet()));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void deleteCustomOrganizationRole(Long organizationId, Long roleId) {
		requireOrganizationAdmin(organizationId);
		Role role = roleRepository.findById(roleId)
				.orElseThrow(() -> new EntityNotFoundException("Role not found"));
		if (role.isSystemDefined() || role.getScope() != RoleScope.ORGANIZATION
				|| !organizationId.equals(role.getOrganizationId())) {
			throw new AccessDeniedException("Only custom roles owned by this organization can be deleted");
		}
		long activeAssignments = authorizationQueryRepository.countActiveOrganizationRoleAssignments(organizationId, roleId);
		if (activeAssignments > 0) {
			throw new IllegalStateException("Cannot delete a custom role that is currently assigned to active members");
		}
		jdbc.update("DELETE FROM role_permissions WHERE role_id = :rid", Map.of("rid", roleId));
		jdbc.update("DELETE FROM membership_roles WHERE role_id = :rid", Map.of("rid", roleId));
		roleRepository.delete(role);
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public List<OrganizationMemberSummaryDto> listOrganizationMemberships(Long organizationId) {
		verifySameOrganizationContext(organizationId);
		List<OrganizationMembership> memberships = membershipRepository.findAll().stream()
				.filter(m -> organizationId.equals(m.getOrganizationId()))
				.sorted(Comparator.comparing(OrganizationMembership::getId))
				.toList();
		if (memberships.isEmpty()) {
			return List.of();
		}
		Map<Long, Users> usersById = userRepository.findAllById(
				memberships.stream().map(OrganizationMembership::getUserId).collect(Collectors.toSet()))
				.stream().collect(Collectors.toMap(Users::getId, Function.identity()));

		List<OrganizationMemberSummaryDto> result = new ArrayList<>();
		for (OrganizationMembership m : memberships) {
			Users u = usersById.get(m.getUserId());
			Set<String> roles = findAssignedRoleCodesForMembership(m.getId(), organizationId);
			result.add(new OrganizationMemberSummaryDto(
					m.getId(),
					m.getUserId(),
					u != null ? u.getFirstName() : null,
					u != null ? u.getLastName() : null,
					u != null ? u.getEmail() : null,
					u != null ? u.getPhoneNumber() : null,
					m.getStatus(),
					roles));
		}
		return result;
	}

	private Set<String> findAssignedRoleCodesForMembership(Long membershipId, Long organizationId) {
		String sql = """
				SELECT DISTINCT r.code
				FROM membership_roles mr
				JOIN roles r ON r.id = mr.role_id
				WHERE mr.membership_id = :mid
				  AND r.scope = 'ORGANIZATION'
				  AND (r.organization_id IS NULL OR r.organization_id = :orgId)
				""";
		return Set.copyOf(jdbc.queryForList(sql, Map.of("mid", membershipId, "orgId", organizationId), String.class));
	}

	private Map<String, Long> validateAndResolveAssignablePermissions(Long organizationId, Set<String> requestedCodes) {
		if (requestedCodes == null || requestedCodes.isEmpty()) {
			throw new IllegalArgumentException("At least one permission is required");
		}
		Set<String> actorPermissions = authorizationQueryRepository.findOrganizationPermissions(
				currentUser.getUserId(), organizationId);
		Map<String, Long> resolved = new LinkedHashMap<>();
		for (String rawCode : requestedCodes) {
			if (rawCode == null || rawCode.isBlank()) {
				continue;
			}
			String code = rawCode.trim();
			if (code.startsWith("platform.")) {
				throw new AccessDeniedException("Platform permissions cannot be assigned to organization roles: " + code);
			}
			if (!actorPermissions.contains(code)) {
				throw new AccessDeniedException("Cannot grant a permission that you do not possess: " + code);
			}
			List<Long> ids = jdbc.queryForList(
					"SELECT id FROM permissions WHERE code = :code AND module <> 'PLATFORM'",
					Map.of("code", code),
					Long.class);
			if (ids.isEmpty()) {
				throw new IllegalArgumentException("Unknown organization permission: " + code);
			}
			resolved.put(code, ids.getFirst());
		}
		if (resolved.isEmpty()) {
			throw new IllegalArgumentException("At least one valid organization permission is required");
		}
		return resolved;
	}

	private void syncRolePermissions(Long roleId, Collection<Long> permissionIds) {
		jdbc.update("DELETE FROM role_permissions WHERE role_id = :rid", Map.of("rid", roleId));
		for (Long pid : permissionIds) {
			jdbc.update(
					"INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)",
					Map.of("rid", roleId, "pid", pid));
		}
	}

	private void verifySameOrganizationContext(Long organizationId) {
		if (currentUser.isPlatformContext() || currentUser.getOrganizationId() == null
				|| !currentUser.getOrganizationId().equals(organizationId)) {
			throw new AccessDeniedException("Organization authorization context does not match requested organization");
		}
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

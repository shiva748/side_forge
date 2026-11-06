package com.side.forge.authorization.repository;

import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.side.forge.authorization.entity.MembershipStatus;
import com.side.forge.authorization.entity.RoleScope;

@Repository
public class AuthorizationQueryRepository {
	private final NamedParameterJdbcTemplate jdbc;

	public AuthorizationQueryRepository(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public boolean hasActiveMembership(Long userId, Long organizationId) {
		Integer count = jdbc.queryForObject(
				"SELECT COUNT(*) FROM organization_memberships m "
						+ "JOIN organizations o ON o.id = m.organization_id "
						+ "JOIN users u ON u.id = m.user_id "
						+ "WHERE m.user_id = :userId AND m.organization_id = :organizationId "
						+ "AND m.status = :status AND o.status = 'ACTIVE' AND u.status = 'ACTIVE'",
				Map.of("userId", userId, "organizationId", organizationId, "status", MembershipStatus.ACTIVE.name()),
				Integer.class);
		return count != null && count > 0;
	}

	public Set<String> findOrganizationRoles(Long userId, Long organizationId) {
		String sql = "SELECT DISTINCT r.code FROM organization_memberships m "
				+ "JOIN membership_roles mr ON mr.membership_id = m.id " + "JOIN roles r ON r.id = mr.role_id "
				+ "WHERE m.user_id = :userId AND m.organization_id = :organizationId "
				+ "AND m.status = :status AND r.scope = :scope "
				+ "AND (r.organization_id IS NULL OR r.organization_id = :organizationId)";
		return Set.copyOf(jdbc.queryForList(sql, organizationParameters(userId, organizationId), String.class));
	}

	public Set<String> findOrganizationPermissions(Long userId, Long organizationId) {
		String sql = "SELECT DISTINCT p.code FROM organization_memberships m "
				+ "JOIN membership_roles mr ON mr.membership_id = m.id " + "JOIN roles r ON r.id = mr.role_id "
				+ "JOIN role_permissions rp ON rp.role_id = r.id " + "JOIN permissions p ON p.id = rp.permission_id "
				+ "WHERE m.user_id = :userId AND m.organization_id = :organizationId "
				+ "AND m.status = :status AND r.scope = :scope "
				+ "AND (r.organization_id IS NULL OR r.organization_id = :organizationId)";
		return Set.copyOf(jdbc.queryForList(sql, organizationParameters(userId, organizationId), String.class));
	}

	public Set<String> findPlatformRoles(Long userId) {
		String sql = "SELECT DISTINCT r.code FROM platform_user_roles pur " + "JOIN roles r ON r.id = pur.role_id "
				+ "WHERE pur.user_id = :userId AND r.scope = :scope AND r.organization_id IS NULL";
		return Set.copyOf(
				jdbc.queryForList(sql, Map.of("userId", userId, "scope", RoleScope.PLATFORM.name()), String.class));
	}

	public Set<String> findPlatformPermissions(Long userId) {
		String sql = "SELECT DISTINCT p.code FROM platform_user_roles pur " + "JOIN roles r ON r.id = pur.role_id "
				+ "JOIN role_permissions rp ON rp.role_id = r.id " + "JOIN permissions p ON p.id = rp.permission_id "
				+ "WHERE pur.user_id = :userId AND r.scope = :scope AND r.organization_id IS NULL";
		return Set.copyOf(
				jdbc.queryForList(sql, Map.of("userId", userId, "scope", RoleScope.PLATFORM.name()), String.class));
	}

	public long countActiveOrganizationRoleAssignments(Long organizationId, Long roleId) {
		Long count = jdbc.queryForObject("SELECT COUNT(*) FROM organization_memberships m "
				+ "JOIN membership_roles mr ON mr.membership_id = m.id "
				+ "WHERE m.organization_id = :organizationId AND m.status = :status " + "AND mr.role_id = :roleId",
				Map.of("organizationId", organizationId, "status", MembershipStatus.ACTIVE.name(), "roleId", roleId),
				Long.class);
		return count == null ? 0L : count;
	}

	public Set<String> findPermissionsForRole(Long roleId) {
		String sql = "SELECT DISTINCT p.code FROM role_permissions rp "
				+ "JOIN permissions p ON p.id = rp.permission_id "
				+ "WHERE rp.role_id = :roleId";
		return Set.copyOf(jdbc.queryForList(sql, Map.of("roleId", roleId), String.class));
	}

	private Map<String, Object> organizationParameters(Long userId, Long organizationId) {
		return Map.of("userId", userId, "organizationId", organizationId, "status", MembershipStatus.ACTIVE.name(),
				"scope", RoleScope.ORGANIZATION.name());
	}
}

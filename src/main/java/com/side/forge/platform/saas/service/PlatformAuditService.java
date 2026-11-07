package com.side.forge.platform.saas.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.dto.SaaSDtos.AuthorizationAuditLogResponse;
import com.side.forge.platform.saas.dto.SaaSDtos.PlatformAuditLogItem;
import com.side.forge.platform.saas.entity.PlatformAuditLog;
import com.side.forge.platform.saas.enums.PlatformAuditAction;
import com.side.forge.platform.saas.repository.PlatformAuditLogRepository;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlatformAuditService {

	private final PlatformAuditLogRepository auditLogRepository;
	private final UserRepository userRepository;
	private final OrganizationRepository organizationRepository;
	private final CurrentUserContext currentUser;
	private final NamedParameterJdbcTemplate jdbc;

	@Transactional
	public PlatformAuditLog recordAction(
			Long explicitActorUserId,
			PlatformAuditAction action,
			String resourceType,
			Long resourceId,
			Long organizationId,
			String summary,
			String details) {
		Long actorId = explicitActorUserId != null ? explicitActorUserId : resolveCurrentUserIdSafely();
		PlatformAuditLog logEntry = new PlatformAuditLog();
		logEntry.setActorUserId(actorId);
		logEntry.setAction(action);
		logEntry.setResourceType(resourceType);
		logEntry.setResourceId(resourceId);
		logEntry.setOrganizationId(organizationId);
		logEntry.setSummary(summary);
		logEntry.setDetails(details);
		return auditLogRepository.save(logEntry);
	}

	@RequirePermission(PermissionCode.PLATFORM_AUDIT_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<PlatformAuditLogItem> getAuditLogs(
			Long organizationId,
			Long actorUserId,
			PlatformAuditAction action,
			String resourceType,
			int page,
			int size) {
		if (page < 0) {
			throw new IllegalArgumentException("Page index must not be negative");
		}
		if (size <= 0 || size > 100) {
			throw new IllegalArgumentException("Page size must be between 1 and 100");
		}
		String normalizedType = (resourceType == null || resourceType.isBlank()) ? null : resourceType.trim().toUpperCase();
		Pageable pageable = PageRequest.of(page, size);
		Page<PlatformAuditLog> rawPage = auditLogRepository.findFiltered(
				organizationId, actorUserId, action, normalizedType, pageable);

		Set<Long> actorIds = rawPage.getContent().stream()
				.map(PlatformAuditLog::getActorUserId)
				.filter(id -> id != null)
				.collect(Collectors.toSet());
		Set<Long> orgIds = rawPage.getContent().stream()
				.map(PlatformAuditLog::getOrganizationId)
				.filter(id -> id != null)
				.collect(Collectors.toSet());

		Map<Long, String> actorEmailMap = actorIds.isEmpty() ? Map.of() :
				userRepository.findAllById(actorIds).stream()
						.collect(Collectors.toMap(Users::getId, Users::getEmail));
		Map<Long, String> orgNameMap = orgIds.isEmpty() ? Map.of() :
				organizationRepository.findAllById(orgIds).stream()
						.collect(Collectors.toMap(Organization::getId, Organization::getName));

		Page<PlatformAuditLogItem> mapped = rawPage.map(item -> new PlatformAuditLogItem(
				item.getId(),
				item.getActorUserId(),
				item.getActorUserId() != null ? actorEmailMap.get(item.getActorUserId()) : null,
				item.getAction(),
				item.getResourceType(),
				item.getResourceId(),
				item.getOrganizationId(),
				item.getOrganizationId() != null ? orgNameMap.get(item.getOrganizationId()) : null,
				item.getSummary(),
				item.getDetails(),
				item.getCreatedAt()
		));
		return PagedResponse.from(mapped);
	}

	@RequirePermission(PermissionCode.PLATFORM_AUDIT_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<AuthorizationAuditLogResponse> getAuthorizationAuditLogs(
			Long organizationId, Long actorUserId, String action, int page, int size) {
		int safePage = Math.max(0, page);
		int safeSize = Math.min(100, Math.max(1, size));
		int offset = safePage * safeSize;

		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("orgId", organizationId)
				.addValue("actorId", actorUserId)
				.addValue("action", (action == null || action.isBlank()) ? null : action.trim())
				.addValue("limit", safeSize)
				.addValue("offset", offset);

		Long total = jdbc.queryForObject("""
				SELECT COUNT(*)
				FROM authorization_audit_logs
				WHERE (:orgId IS NULL OR organization_id = :orgId)
				  AND (:actorId IS NULL OR actor_user_id = :actorId)
				  AND (:action IS NULL OR action = :action)
				""", params, Long.class);
		long totalElements = total != null ? total : 0L;

		List<AuthorizationAuditLogResponse> content = jdbc.query("""
				SELECT id, actor_user_id, target_user_id, organization_id, action, details, created_at
				FROM authorization_audit_logs
				WHERE (:orgId IS NULL OR organization_id = :orgId)
				  AND (:actorId IS NULL OR actor_user_id = :actorId)
				  AND (:action IS NULL OR action = :action)
				ORDER BY created_at DESC, id DESC
				LIMIT :limit OFFSET :offset
				""", params, (rs, rowNum) -> new AuthorizationAuditLogResponse(
				rs.getLong("id"),
				rs.getObject("actor_user_id", Long.class),
				rs.getObject("target_user_id", Long.class),
				rs.getObject("organization_id", Long.class),
				rs.getString("action"),
				rs.getString("details"),
				rs.getTimestamp("created_at").toInstant()
		));

		int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
		return new PagedResponse<>(
				content,
				safePage,
				safeSize,
				totalElements,
				totalPages,
				safePage == 0,
				totalPages == 0 || safePage >= totalPages - 1
		);
	}

	private Long resolveCurrentUserIdSafely() {
		try {
			return currentUser.getUserId();
		} catch (Exception ex) {
			return null;
		}
	}
}

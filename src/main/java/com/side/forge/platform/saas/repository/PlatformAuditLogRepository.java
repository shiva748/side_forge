package com.side.forge.platform.saas.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.platform.saas.entity.PlatformAuditLog;
import com.side.forge.platform.saas.enums.PlatformAuditAction;

public interface PlatformAuditLogRepository extends JpaRepository<PlatformAuditLog, Long> {

	@Query("""
			SELECT a FROM PlatformAuditLog a
			WHERE (:organizationId IS NULL OR a.organizationId = :organizationId)
			  AND (:actorUserId IS NULL OR a.actorUserId = :actorUserId)
			  AND (:action IS NULL OR a.action = :action)
			  AND (:resourceType IS NULL OR a.resourceType = :resourceType)
			ORDER BY a.createdAt DESC, a.id DESC
			""")
	Page<PlatformAuditLog> findFiltered(
			@Param("organizationId") Long organizationId,
			@Param("actorUserId") Long actorUserId,
			@Param("action") PlatformAuditAction action,
			@Param("resourceType") String resourceType,
			Pageable pageable);
}

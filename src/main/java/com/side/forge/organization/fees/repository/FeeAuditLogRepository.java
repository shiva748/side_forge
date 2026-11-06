package com.side.forge.organization.fees.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.fees.entity.FeeAuditLog;

public interface FeeAuditLogRepository extends JpaRepository<FeeAuditLog, Long> {

	List<FeeAuditLog> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByPerformedAtDescIdDesc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<FeeAuditLog> findAllByOrganizationIdAndEntityTypeAndEntityIdOrderByPerformedAtDescIdDesc(
			Long organizationId, String entityType, Long entityId);
}

package com.side.forge.organization.attendance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.attendance.entity.AttendanceAuditLog;
import com.side.forge.organization.attendance.entity.AttendanceAuditLog.TargetType;

public interface AttendanceAuditLogRepository extends JpaRepository<AttendanceAuditLog, Long> {

	List<AttendanceAuditLog> findAllByOrganizationIdAndTargetTypeAndAttendanceRecordIdOrderByChangedAtDesc(
			Long organizationId, TargetType targetType, Long attendanceRecordId);
}

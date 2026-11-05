package com.side.forge.authorization.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.authorization.entity.AuthorizationAuditLog;

public interface AuthorizationAuditLogRepository extends JpaRepository<AuthorizationAuditLog, Long> {
}

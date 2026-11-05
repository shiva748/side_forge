package com.side.forge.organization.academic.session.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;

public interface AcademicSessionRepository extends JpaRepository<AcademicSession, Long> {

	Optional<AcademicSession> findByIdAndOrganizationId(Long id, Long organizationId);

	List<AcademicSession> findAllByOrganizationIdOrderByCreatedAtDescIdDesc(Long organizationId);

	List<AcademicSession> findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(
			Long organizationId, AcademicSessionStatus status);

	boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

	boolean existsByOrganizationIdAndNameIgnoreCaseAndIdNot(Long organizationId, String name, Long id);

	boolean existsByOrganizationIdAndStatus(Long organizationId, AcademicSessionStatus status);
}

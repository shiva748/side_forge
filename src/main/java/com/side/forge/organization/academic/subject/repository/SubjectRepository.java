package com.side.forge.organization.academic.subject.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.academic.subject.entity.Subject;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

	Optional<Subject> findByIdAndOrganizationId(Long id, Long organizationId);

	List<Subject> findAllByOrganizationIdOrderByNameAsc(Long organizationId);

	List<Subject> findAllByOrganizationIdAndActiveOrderByNameAsc(Long organizationId, boolean active);

	boolean existsByOrganizationIdAndCodeIgnoreCase(Long organizationId, String code);

	boolean existsByOrganizationIdAndCodeIgnoreCaseAndIdNot(Long organizationId, String code, Long id);
}

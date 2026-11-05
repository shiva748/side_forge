package com.side.forge.organization.student.guardian.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.student.guardian.entity.Guardian;

public interface GuardianRepository extends JpaRepository<Guardian, Long> {

	Optional<Guardian> findByIdAndOrganizationId(Long id, Long organizationId);

	List<Guardian> findAllByOrganizationIdOrderByFirstNameAscLastNameAsc(Long organizationId);

	List<Guardian> findAllByOrganizationIdAndIdIn(Long organizationId, Collection<Long> ids);
}

package com.side.forge.organization.fees.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.fees.entity.StudentFeeConcession;

public interface StudentFeeConcessionRepository extends JpaRepository<StudentFeeConcession, Long> {

	Optional<StudentFeeConcession> findByIdAndOrganizationId(Long id, Long organizationId);

	List<StudentFeeConcession> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdAndActiveTrueOrderByIdAsc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<StudentFeeConcession> findAllByOrganizationIdAndAcademicSessionIdOrderByIdAsc(
			Long organizationId, Long academicSessionId);
}

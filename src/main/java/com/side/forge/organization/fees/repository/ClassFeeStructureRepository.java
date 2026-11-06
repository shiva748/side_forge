package com.side.forge.organization.fees.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.fees.entity.ClassFeeStructure;
import com.side.forge.organization.fees.entity.FeeStructureStatus;

import jakarta.persistence.LockModeType;

public interface ClassFeeStructureRepository extends JpaRepository<ClassFeeStructure, Long> {

	Optional<ClassFeeStructure> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT f FROM ClassFeeStructure f WHERE f.id = :id AND f.organizationId = :organizationId")
	Optional<ClassFeeStructure> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	Optional<ClassFeeStructure> findFirstByOrganizationIdAndAcademicSessionIdAndClassIdAndStatusOrderByVersionNumberDesc(
			Long organizationId, Long academicSessionId, Long classId, FeeStructureStatus status);

	List<ClassFeeStructure> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByVersionNumberDesc(
			Long organizationId, Long academicSessionId, Long classId);

	List<ClassFeeStructure> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscVersionNumberDesc(
			Long organizationId, Long academicSessionId);
}

package com.side.forge.organization.examination.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.examination.entity.Examination;

import jakarta.persistence.LockModeType;

public interface ExaminationRepository extends JpaRepository<Examination, Long> {

	Optional<Examination> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT e FROM Examination e WHERE e.id = :id AND e.organizationId = :organizationId")
	Optional<Examination> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<Examination> findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(
			Long organizationId, Long academicSessionId);

	List<Examination> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByStartDateAscIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassIdAndNameIgnoreCase(
			Long organizationId, Long academicSessionId, Long classId, String name);
}

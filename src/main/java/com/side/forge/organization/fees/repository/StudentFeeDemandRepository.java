package com.side.forge.organization.fees.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.fees.entity.FeeFrequency;
import com.side.forge.organization.fees.entity.StudentFeeDemand;

import jakarta.persistence.LockModeType;

public interface StudentFeeDemandRepository extends JpaRepository<StudentFeeDemand, Long> {

	Optional<StudentFeeDemand> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT d FROM StudentFeeDemand d WHERE d.id = :id AND d.organizationId = :organizationId")
	Optional<StudentFeeDemand> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT d FROM StudentFeeDemand d WHERE d.organizationId = :organizationId AND d.id IN :ids ORDER BY d.id ASC")
	List<StudentFeeDemand> findAllByOrganizationIdAndIdInForUpdate(
			@Param("organizationId") Long organizationId, @Param("ids") Collection<Long> ids);

	boolean existsByOrganizationIdAndAcademicSessionIdAndStudentIdAndClassIdAndComponentCodeAndFrequencyAndBillingYearAndBillingMonth(
			Long organizationId, Long academicSessionId, Long studentId, Long classId,
			String componentCode, FeeFrequency frequency, int billingYear, int billingMonth);

	List<StudentFeeDemand> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByDueDateAscIdAsc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<StudentFeeDemand> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByStudentIdAscDueDateAscIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	List<StudentFeeDemand> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscStudentIdAscDueDateAscIdAsc(
			Long organizationId, Long academicSessionId);

	boolean existsByOrganizationIdAndFeeStructureId(Long organizationId, Long feeStructureId);
}

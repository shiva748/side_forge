package com.side.forge.organization.fees.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.fees.entity.OfflinePaymentSubmissionStatus;
import com.side.forge.organization.fees.entity.ParentFeePaymentSubmission;

import jakarta.persistence.LockModeType;

public interface ParentFeePaymentSubmissionRepository extends JpaRepository<ParentFeePaymentSubmission, Long> {

	List<ParentFeePaymentSubmission> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByCreatedAtDescIdDesc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<ParentFeePaymentSubmission> findAllByOrganizationIdAndAcademicSessionIdOrderByCreatedAtDescIdDesc(
			Long organizationId, Long academicSessionId);

	Optional<ParentFeePaymentSubmission> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT s FROM ParentFeePaymentSubmission s WHERE s.id = :id AND s.organizationId = :orgId")
	Optional<ParentFeePaymentSubmission> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("orgId") Long organizationId);

	@Query("""
			SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
			FROM ParentFeePaymentSubmission s
			WHERE s.organizationId = :organizationId
			  AND UPPER(s.utrOrReferenceNumber) = UPPER(:utrOrReferenceNumber)
			  AND s.status IN :statuses
			""")
	boolean existsByOrganizationIdAndUtrOrReferenceNumberIgnoreCaseAndStatusIn(
			@Param("organizationId") Long organizationId,
			@Param("utrOrReferenceNumber") String utrOrReferenceNumber,
			@Param("statuses") Collection<OfflinePaymentSubmissionStatus> statuses);
}

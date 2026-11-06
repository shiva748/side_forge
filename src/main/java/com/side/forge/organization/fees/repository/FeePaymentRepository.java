package com.side.forge.organization.fees.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.fees.entity.FeePayment;

import jakarta.persistence.LockModeType;

public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {

	Optional<FeePayment> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT p FROM FeePayment p WHERE p.id = :id AND p.organizationId = :organizationId")
	Optional<FeePayment> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	Optional<FeePayment> findByOrganizationIdAndReceiptNumber(Long organizationId, String receiptNumber);

	Optional<FeePayment> findByOrganizationIdAndIdempotencyKey(Long organizationId, String idempotencyKey);

	List<FeePayment> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByPaymentDateDescIdDesc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<FeePayment> findAllByOrganizationIdAndAcademicSessionIdOrderByPaymentDateDescIdDesc(
			Long organizationId, Long academicSessionId);
}

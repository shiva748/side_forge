package com.side.forge.platform.saas.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.platform.saas.entity.SubscriptionPayment;
import com.side.forge.platform.saas.enums.SubscriptionPaymentStatus;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

	Optional<SubscriptionPayment> findByIdAndOrganizationId(Long id, Long organizationId);

	boolean existsByInvoiceNumberIgnoreCase(String invoiceNumber);

	List<SubscriptionPayment> findAllByOrganizationIdOrderByPaymentDateDescIdDesc(Long organizationId);

	List<SubscriptionPayment> findAllBySubscriptionIdOrderByPaymentDateDescIdDesc(Long subscriptionId);

	@Query("""
			SELECT p FROM SubscriptionPayment p
			WHERE (:organizationId IS NULL OR p.organizationId = :organizationId)
			  AND (:status IS NULL OR p.status = :status)
			ORDER BY p.paymentDate DESC, p.id DESC
			""")
	Page<SubscriptionPayment> findFilteredPayments(
			@Param("organizationId") Long organizationId,
			@Param("status") SubscriptionPaymentStatus status,
			Pageable pageable);

	@Query("""
			SELECT COALESCE(SUM(p.amountReceived), 0)
			FROM SubscriptionPayment p
			WHERE p.status <> com.side.forge.platform.saas.enums.SubscriptionPaymentStatus.VOIDED
			""")
	BigDecimal sumTotalRevenue();

	@Query("""
			SELECT COALESCE(SUM(p.amountReceived), 0)
			FROM SubscriptionPayment p
			WHERE p.organizationId = :organizationId
			  AND p.status <> com.side.forge.platform.saas.enums.SubscriptionPaymentStatus.VOIDED
			""")
	BigDecimal sumRevenueByOrganization(@Param("organizationId") Long organizationId);
}

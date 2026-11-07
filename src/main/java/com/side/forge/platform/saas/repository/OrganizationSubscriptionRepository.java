package com.side.forge.platform.saas.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.platform.saas.entity.OrganizationSubscription;
import com.side.forge.platform.saas.enums.SubscriptionStatus;

import jakarta.persistence.LockModeType;

public interface OrganizationSubscriptionRepository extends JpaRepository<OrganizationSubscription, Long> {

	Optional<OrganizationSubscription> findByOrganizationIdAndCurrentSubscriptionTrue(Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT s FROM OrganizationSubscription s WHERE s.organizationId = :organizationId AND s.currentSubscription = true")
	Optional<OrganizationSubscription> findCurrentByOrganizationIdForUpdate(@Param("organizationId") Long organizationId);

	List<OrganizationSubscription> findAllByOrganizationIdOrderByIdDesc(Long organizationId);

	List<OrganizationSubscription> findAllByCurrentSubscriptionTrueOrderByOrganizationIdAsc();

	List<OrganizationSubscription> findAllByOrganizationIdInAndCurrentSubscriptionTrue(Collection<Long> organizationIds);

	boolean existsByOrganizationId(Long organizationId);

	@Query("""
			SELECT s FROM OrganizationSubscription s
			WHERE s.currentSubscription = true
			  AND s.expiryDate BETWEEN :fromDate AND :toDate
			  AND (:status IS NULL OR s.status = :status)
			  AND (:planId IS NULL OR s.planId = :planId)
			ORDER BY s.expiryDate ASC, s.id ASC
			""")
	List<OrganizationSubscription> findUpcomingExpirations(
			@Param("fromDate") LocalDate fromDate,
			@Param("toDate") LocalDate toDate,
			@Param("status") SubscriptionStatus status,
			@Param("planId") Long planId);
}

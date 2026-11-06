package com.side.forge.organization.fees.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.fees.entity.FeePaymentAllocation;

public interface FeePaymentAllocationRepository extends JpaRepository<FeePaymentAllocation, Long> {

	List<FeePaymentAllocation> findAllByOrganizationIdAndPaymentIdOrderByIdAsc(
			Long organizationId, Long paymentId);

	List<FeePaymentAllocation> findAllByOrganizationIdAndPaymentIdInOrderByIdAsc(
			Long organizationId, Collection<Long> paymentIds);

	List<FeePaymentAllocation> findAllByOrganizationIdAndDemandIdOrderByIdAsc(
			Long organizationId, Long demandId);
}

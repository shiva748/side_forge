package com.side.forge.platform.saas.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.platform.saas.entity.OrganizationFeatureEntitlement;
import com.side.forge.platform.saas.enums.PlatformFeature;

public interface OrganizationFeatureEntitlementRepository extends JpaRepository<OrganizationFeatureEntitlement, Long> {

	Optional<OrganizationFeatureEntitlement> findByOrganizationIdAndFeature(Long organizationId, PlatformFeature feature);

	List<OrganizationFeatureEntitlement> findAllByOrganizationIdOrderByFeatureAsc(Long organizationId);

	boolean existsByOrganizationId(Long organizationId);
}

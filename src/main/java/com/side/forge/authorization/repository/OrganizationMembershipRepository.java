package com.side.forge.authorization.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.authorization.entity.MembershipStatus;
import com.side.forge.authorization.entity.OrganizationMembership;

public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, Long> {
	Optional<OrganizationMembership> findByUserIdAndOrganizationIdAndStatus(Long userId, Long organizationId,
			MembershipStatus status);
	Optional<OrganizationMembership> findByUserIdAndOrganizationId(Long userId, Long organizationId);
}

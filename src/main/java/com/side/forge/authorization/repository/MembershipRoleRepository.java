package com.side.forge.authorization.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.authorization.entity.MembershipRole;

public interface MembershipRoleRepository extends JpaRepository<MembershipRole, Long> {
	Optional<MembershipRole> findByMembershipIdAndRoleId(Long membershipId, Long roleId);
	void deleteByMembershipIdAndRoleId(Long membershipId, Long roleId);
}

package com.side.forge.authorization.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.authorization.entity.PlatformUserRole;

public interface PlatformUserRoleRepository extends JpaRepository<PlatformUserRole, Long> {
	Optional<PlatformUserRole> findByUserIdAndRoleId(Long userId, Long roleId);
	long countByRoleId(Long roleId);
	void deleteByUserIdAndRoleId(Long userId, Long roleId);
}

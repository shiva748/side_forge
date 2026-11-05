package com.side.forge.authorization.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.authorization.entity.Role;
import com.side.forge.authorization.entity.RoleScope;

public interface RoleRepository extends JpaRepository<Role, Long> {
	Optional<Role> findByCodeAndScopeAndOrganizationId(String code, RoleScope scope, Long organizationId);
}

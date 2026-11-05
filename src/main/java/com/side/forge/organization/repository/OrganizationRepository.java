package com.side.forge.organization.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.entity.Organization;

import jakarta.persistence.LockModeType;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT o FROM Organization o WHERE o.id = :id")
	Optional<Organization> findByIdForUpdate(@Param("id") Long id);
}
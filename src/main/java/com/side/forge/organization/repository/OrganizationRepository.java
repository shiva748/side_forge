package com.side.forge.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.entity.Organization;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
}
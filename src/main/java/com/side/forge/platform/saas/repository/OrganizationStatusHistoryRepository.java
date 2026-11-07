package com.side.forge.platform.saas.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.platform.saas.entity.OrganizationStatusHistory;

public interface OrganizationStatusHistoryRepository extends JpaRepository<OrganizationStatusHistory, Long> {

	List<OrganizationStatusHistory> findAllByOrganizationIdOrderByCreatedAtDescIdDesc(Long organizationId);
}

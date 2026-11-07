package com.side.forge.platform.saas.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.platform.saas.entity.OrganizationSubscriptionHistory;

public interface OrganizationSubscriptionHistoryRepository extends JpaRepository<OrganizationSubscriptionHistory, Long> {

	List<OrganizationSubscriptionHistory> findAllByOrganizationIdOrderByCreatedAtDescIdDesc(Long organizationId);
}

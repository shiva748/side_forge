package com.side.forge.platform.saas.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.platform.saas.entity.SubscriptionPlan;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {

	Optional<SubscriptionPlan> findByCodeIgnoreCase(String code);

	boolean existsByCodeIgnoreCase(String code);

	boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

	List<SubscriptionPlan> findAllByOrderByDisplayOrderAscIdAsc();

	List<SubscriptionPlan> findAllByActiveOrderByDisplayOrderAscIdAsc(boolean active);

	Optional<SubscriptionPlan> findFirstByDefaultTrialPlanTrueAndActiveTrueOrderByDisplayOrderAscIdAsc();
}

package com.side.forge.organization.examination.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.examination.entity.GradingRule;

public interface GradingRuleRepository extends JpaRepository<GradingRule, Long> {

	List<GradingRule> findAllByOrganizationIdAndGradingScaleIdOrderByMaxPercentageDesc(
			Long organizationId, Long gradingScaleId);

	boolean existsByOrganizationIdAndGradingScaleIdAndGradeIgnoreCase(
			Long organizationId, Long gradingScaleId, String grade);
}

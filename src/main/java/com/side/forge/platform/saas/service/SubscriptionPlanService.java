package com.side.forge.platform.saas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.platform.saas.dto.SaaSDtos.ChangePlanStatusRequest;
import com.side.forge.platform.saas.dto.SaaSDtos.CreateSubscriptionPlanRequest;
import com.side.forge.platform.saas.dto.SaaSDtos.PlatformFeatureCatalogItem;
import com.side.forge.platform.saas.dto.SaaSDtos.SubscriptionPlanResponse;
import com.side.forge.platform.saas.dto.SaaSDtos.UpdateSubscriptionPlanRequest;
import com.side.forge.platform.saas.entity.SubscriptionPlan;
import com.side.forge.platform.saas.enums.PlatformAuditAction;
import com.side.forge.platform.saas.enums.PlatformFeature;
import com.side.forge.platform.saas.repository.SubscriptionPlanRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

	private final SubscriptionPlanRepository planRepository;
	private final PlatformAuditService auditService;

	@RequirePermission(PermissionCode.PLATFORM_PLAN_MANAGE)
	@Transactional
	public SubscriptionPlanResponse createPlan(CreateSubscriptionPlanRequest request) {
		String code = normalizeCode(request.code());
		String name = normalizeRequiredText(request.name(), "Plan name");
		if (planRepository.existsByCodeIgnoreCase(code)) {
			throw new IllegalStateException("Subscription plan with code '" + code + "' already exists");
		}
		validatePlanPricingAndLimits(request.monthlyPrice(), request.yearlyPrice(), request.maxStudents(), request.includedFeatures());

		if (Boolean.TRUE.equals(request.defaultTrialPlan())) {
			clearExistingDefaultTrialFlag(null);
		}

		SubscriptionPlan plan = new SubscriptionPlan();
		plan.setCode(code);
		plan.setName(name);
		plan.setDescription(normalizeOptionalText(request.description()));
		plan.setMonthlyPrice(request.monthlyPrice().setScale(2, RoundingMode.HALF_UP));
		plan.setYearlyPrice(request.yearlyPrice().setScale(2, RoundingMode.HALF_UP));
		plan.setMaxStudents(request.maxStudents());
		plan.setActive(true);
		plan.setDefaultTrialPlan(Boolean.TRUE.equals(request.defaultTrialPlan()));
		plan.setDefaultTrialDays(request.defaultTrialDays() != null ? request.defaultTrialDays() : 30);
		plan.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : 10);
		plan.setMetadata(normalizeOptionalText(request.metadata()));
		plan.setIncludedFeatures(new LinkedHashSet<>(request.includedFeatures()));

		SubscriptionPlan saved = planRepository.save(plan);
		auditService.recordAction(
				null,
				PlatformAuditAction.PLAN_CREATED,
				"SUBSCRIPTION_PLAN",
				saved.getId(),
				null,
				"Created subscription plan " + saved.getCode(),
				"monthlyPrice=" + saved.getMonthlyPrice() + ", yearlyPrice=" + saved.getYearlyPrice()
						+ ", maxStudents=" + saved.getMaxStudents() + ", features=" + saved.getIncludedFeatures());
		return toResponse(saved);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_MANAGE)
	@Transactional
	public SubscriptionPlanResponse updatePlan(Long planId, UpdateSubscriptionPlanRequest request) {
		SubscriptionPlan plan = requirePlan(planId);
		String name = normalizeRequiredText(request.name(), "Plan name");
		validatePlanPricingAndLimits(request.monthlyPrice(), request.yearlyPrice(), request.maxStudents(), request.includedFeatures());

		String beforeSummary = "name=" + plan.getName() + ", monthlyPrice=" + plan.getMonthlyPrice()
				+ ", yearlyPrice=" + plan.getYearlyPrice() + ", maxStudents=" + plan.getMaxStudents()
				+ ", features=" + plan.getIncludedFeatures();

		if (Boolean.TRUE.equals(request.defaultTrialPlan())) {
			clearExistingDefaultTrialFlag(plan.getId());
		}

		plan.setName(name);
		plan.setDescription(normalizeOptionalText(request.description()));
		plan.setMonthlyPrice(request.monthlyPrice().setScale(2, RoundingMode.HALF_UP));
		plan.setYearlyPrice(request.yearlyPrice().setScale(2, RoundingMode.HALF_UP));
		plan.setMaxStudents(request.maxStudents());
		if (request.defaultTrialPlan() != null) {
			plan.setDefaultTrialPlan(request.defaultTrialPlan());
		}
		if (request.defaultTrialDays() != null) {
			plan.setDefaultTrialDays(request.defaultTrialDays());
		}
		if (request.displayOrder() != null) {
			plan.setDisplayOrder(request.displayOrder());
		}
		plan.setMetadata(normalizeOptionalText(request.metadata()));
		plan.setIncludedFeatures(new LinkedHashSet<>(request.includedFeatures()));

		SubscriptionPlan saved = planRepository.save(plan);
		String afterSummary = "name=" + saved.getName() + ", monthlyPrice=" + saved.getMonthlyPrice()
				+ ", yearlyPrice=" + saved.getYearlyPrice() + ", maxStudents=" + saved.getMaxStudents()
				+ ", features=" + saved.getIncludedFeatures();

		auditService.recordAction(
				null,
				PlatformAuditAction.PLAN_UPDATED,
				"SUBSCRIPTION_PLAN",
				saved.getId(),
				null,
				"Updated subscription plan " + saved.getCode(),
				"Before: [" + beforeSummary + "] -> After: [" + afterSummary + "]");
		return toResponse(saved);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_MANAGE)
	@Transactional
	public SubscriptionPlanResponse deactivatePlan(Long planId) {
		SubscriptionPlan plan = requirePlan(planId);
		if (!plan.isActive()) {
			throw new IllegalStateException("Subscription plan is already inactive");
		}
		plan.setActive(false);
		SubscriptionPlan saved = planRepository.save(plan);
		auditService.recordAction(
				null,
				PlatformAuditAction.PLAN_DEACTIVATED,
				"SUBSCRIPTION_PLAN",
				saved.getId(),
				null,
				"Deactivated subscription plan " + saved.getCode(),
				"Existing subscriptions and history preserved");
		return toResponse(saved);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_MANAGE)
	@Transactional
	public SubscriptionPlanResponse activatePlan(Long planId) {
		SubscriptionPlan plan = requirePlan(planId);
		if (plan.isActive()) {
			throw new IllegalStateException("Subscription plan is already active");
		}
		plan.setActive(true);
		SubscriptionPlan saved = planRepository.save(plan);
		auditService.recordAction(
				null,
				PlatformAuditAction.PLAN_ACTIVATED,
				"SUBSCRIPTION_PLAN",
				saved.getId(),
				null,
				"Activated subscription plan " + saved.getCode(),
				"Plan re-enabled for new subscriptions");
		return toResponse(saved);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_VIEW)
	@Transactional(readOnly = true)
	public List<SubscriptionPlanResponse> listPlans(Boolean activeOnly) {
		return getPlans(activeOnly);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_VIEW)
	@Transactional(readOnly = true)
	public SubscriptionPlanResponse getPlan(Long planId) {
		return getPlanById(planId);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_MANAGE)
	@Transactional
	public SubscriptionPlanResponse changePlanStatus(Long planId, ChangePlanStatusRequest request) {
		if (Boolean.TRUE.equals(request.active())) {
			return activatePlan(planId);
		}
		return deactivatePlan(planId);
	}

	@Transactional
	public void seedDefaultPlansIfMissing() {
		seedPlanIfMissing(
				"STARTER", "Starter Plan", "Essential school operations for small campuses",
				new BigDecimal("2999.00"), new BigDecimal("29990.00"), 150, 30, true, 1,
				Set.of(
						PlatformFeature.ACADEMIC_MANAGEMENT, PlatformFeature.STUDENT_MANAGEMENT,
						PlatformFeature.STAFF_MANAGEMENT, PlatformFeature.TIMETABLE,
						PlatformFeature.ATTENDANCE, PlatformFeature.COMMUNICATION_AND_NOTIFICATIONS,
						PlatformFeature.DASHBOARD_AND_REPORTS, PlatformFeature.FILE_STORAGE));
		seedPlanIfMissing(
				"GROWTH", "Growth Plan", "Growing schools with examinations, homework, and fee management",
				new BigDecimal("6999.00"), new BigDecimal("69990.00"), 500, 30, false, 2,
				Set.of(
						PlatformFeature.ACADEMIC_MANAGEMENT, PlatformFeature.STUDENT_MANAGEMENT,
						PlatformFeature.STAFF_MANAGEMENT, PlatformFeature.TIMETABLE,
						PlatformFeature.ATTENDANCE, PlatformFeature.EXAMINATION_AND_RESULTS,
						PlatformFeature.FEES_AND_FINANCE, PlatformFeature.HOMEWORK_AND_ASSIGNMENTS,
						PlatformFeature.COMMUNICATION_AND_NOTIFICATIONS, PlatformFeature.DASHBOARD_AND_REPORTS,
						PlatformFeature.FILE_STORAGE));
		seedPlanIfMissing(
				"PROFESSIONAL", "Professional Plan", "Comprehensive digital campus including Parent Portal and exports",
				new BigDecimal("14999.00"), new BigDecimal("149990.00"), 1500, 30, false, 3,
				Set.of(
						PlatformFeature.ACADEMIC_MANAGEMENT, PlatformFeature.STUDENT_MANAGEMENT,
						PlatformFeature.STAFF_MANAGEMENT, PlatformFeature.TIMETABLE,
						PlatformFeature.ATTENDANCE, PlatformFeature.EXAMINATION_AND_RESULTS,
						PlatformFeature.FEES_AND_FINANCE, PlatformFeature.HOMEWORK_AND_ASSIGNMENTS,
						PlatformFeature.COMMUNICATION_AND_NOTIFICATIONS, PlatformFeature.DASHBOARD_AND_REPORTS,
						PlatformFeature.REPORT_EXPORTS, PlatformFeature.PARENT_PORTAL,
						PlatformFeature.FILE_STORAGE));
		seedPlanIfMissing(
				"ENTERPRISE", "Enterprise Plan", "Full-suite institutional platform for large campuses",
				new BigDecimal("29999.00"), new BigDecimal("299990.00"), 10000, 30, false, 4,
				EnumSet.allOf(PlatformFeature.class));
	}

	private void seedPlanIfMissing(
			String code, String name, String description,
			BigDecimal monthlyPrice, BigDecimal yearlyPrice,
			int maxStudents, int trialDays, boolean defaultTrial, int order,
			Set<PlatformFeature> features) {
		if (planRepository.existsByCodeIgnoreCase(code)) {
			return;
		}
		SubscriptionPlan plan = new SubscriptionPlan();
		plan.setCode(code);
		plan.setName(name);
		plan.setDescription(description);
		plan.setMonthlyPrice(monthlyPrice);
		plan.setYearlyPrice(yearlyPrice);
		plan.setMaxStudents(maxStudents);
		plan.setActive(true);
		plan.setDefaultTrialPlan(defaultTrial);
		plan.setDefaultTrialDays(trialDays);
		plan.setDisplayOrder(order);
		plan.setIncludedFeatures(new LinkedHashSet<>(features));
		planRepository.save(plan);
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_VIEW)
	@Transactional(readOnly = true)
	public List<SubscriptionPlanResponse> getPlans(Boolean activeOnly) {
		List<SubscriptionPlan> plans = Boolean.TRUE.equals(activeOnly)
				? planRepository.findAllByActiveOrderByDisplayOrderAscIdAsc(true)
				: planRepository.findAllByOrderByDisplayOrderAscIdAsc();
		return plans.stream().map(this::toResponse).toList();
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_VIEW)
	@Transactional(readOnly = true)
	public SubscriptionPlanResponse getPlanById(Long planId) {
		return toResponse(requirePlan(planId));
	}

	@RequirePermission(PermissionCode.PLATFORM_PLAN_VIEW)
	@Transactional(readOnly = true)
	public List<PlatformFeatureCatalogItem> getFeaturesCatalog() {
		return Arrays.stream(PlatformFeature.values())
				.map(f -> new PlatformFeatureCatalogItem(f, f.getDisplayName(), f.getDescription()))
				.toList();
	}

	public SubscriptionPlan requirePlan(Long planId) {
		return planRepository.findById(planId)
				.orElseThrow(() -> new EntityNotFoundException("Subscription plan not found: " + planId));
	}

	public SubscriptionPlan requireActivePlan(Long planId) {
		SubscriptionPlan plan = requirePlan(planId);
		if (!plan.isActive()) {
			throw new IllegalStateException("Subscription plan '" + plan.getName() + "' is inactive and cannot be assigned");
		}
		return plan;
	}

	public SubscriptionPlan resolveDefaultTrialPlan() {
		return planRepository.findFirstByDefaultTrialPlanTrueAndActiveTrueOrderByDisplayOrderAscIdAsc()
				.or(() -> planRepository.findByCodeIgnoreCase("STARTER").filter(SubscriptionPlan::isActive))
				.or(() -> planRepository.findAllByActiveOrderByDisplayOrderAscIdAsc(true).stream().findFirst())
				.orElseThrow(() -> new IllegalStateException("No active subscription plan available for onboarding trial"));
	}

	public SubscriptionPlanResponse toResponse(SubscriptionPlan plan) {
		return new SubscriptionPlanResponse(
				plan.getId(),
				plan.getCode(),
				plan.getName(),
				plan.getDescription(),
				plan.getMonthlyPrice(),
				plan.getYearlyPrice(),
				plan.getMaxStudents(),
				plan.isActive(),
				plan.isDefaultTrialPlan(),
				plan.getDefaultTrialDays(),
				plan.getDisplayOrder(),
				plan.getMetadata(),
				new LinkedHashSet<>(plan.getIncludedFeatures()),
				plan.getCreatedAt(),
				plan.getUpdatedAt()
		);
	}

	private void clearExistingDefaultTrialFlag(Long excludePlanId) {
		for (SubscriptionPlan p : planRepository.findAll()) {
			if (p.isDefaultTrialPlan() && (excludePlanId == null || !excludePlanId.equals(p.getId()))) {
				p.setDefaultTrialPlan(false);
				planRepository.save(p);
			}
		}
	}

	private void validatePlanPricingAndLimits(
			BigDecimal monthlyPrice, BigDecimal yearlyPrice, Integer maxStudents, Set<PlatformFeature> features) {
		if (monthlyPrice == null || monthlyPrice.compareTo(BigDecimal.ZERO) < 0) {
			throw new IllegalArgumentException("Monthly price must not be negative");
		}
		if (yearlyPrice == null || yearlyPrice.compareTo(BigDecimal.ZERO) < 0) {
			throw new IllegalArgumentException("Yearly price must not be negative");
		}
		if (maxStudents == null || maxStudents <= 0) {
			throw new IllegalArgumentException("Maximum student limit must be a positive number");
		}
		if (features == null || features.isEmpty()) {
			throw new IllegalArgumentException("At least one module/feature must be included in the plan");
		}
	}

	private String normalizeCode(String code) {
		if (code == null || code.isBlank()) {
			throw new IllegalArgumentException("Plan code is required");
		}
		return code.trim().toUpperCase(Locale.ROOT);
	}

	private String normalizeRequiredText(String text, String label) {
		if (text == null || text.isBlank()) {
			throw new IllegalArgumentException(label + " is required");
		}
		return text.trim();
	}

	private String normalizeOptionalText(String text) {
		return text == null || text.isBlank() ? null : text.trim();
	}
}

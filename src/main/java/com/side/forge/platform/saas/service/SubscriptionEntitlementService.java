package com.side.forge.platform.saas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.dto.SaaSDtos.*;
import com.side.forge.platform.saas.entity.*;
import com.side.forge.platform.saas.enums.*;
import com.side.forge.platform.saas.exception.SubscriptionAccessException;
import com.side.forge.platform.saas.repository.*;
import com.side.forge.storage.entity.FileResourceCategory;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubscriptionEntitlementService {

	private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Kolkata");
	public static final int GRACE_PERIOD_DAYS = 15;

	private final OrganizationRepository organizationRepository;
	private final OrganizationSubscriptionRepository subscriptionRepository;
	private final OrganizationSubscriptionHistoryRepository subscriptionHistoryRepository;
	private final SubscriptionPlanRepository planRepository;
	private final OrganizationFeatureEntitlementRepository featureEntitlementRepository;
	private final PlatformAuditService auditService;
	private final NamedParameterJdbcTemplate jdbc;
	private final CurrentUserContext currentUser;

	public SubscriptionStatus resolveEffectiveStatus(OrganizationSubscription subscription, LocalDate today) {
		if (subscription == null) {
			return null;
		}
		SubscriptionStatus status = subscription.getStatus();
		if (subscription.getExpiryDate() != null && subscription.getExpiryDate().isBefore(today)) {
			if (subscription.isTrial() || status == SubscriptionStatus.TRIAL) {
				return SubscriptionStatus.EXPIRED;
			}
			if (status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PAST_DUE) {
				LocalDate gracePeriodEnd = subscription.getExpiryDate().plusDays(GRACE_PERIOD_DAYS);
				if (!today.isAfter(gracePeriodEnd)) {
					return SubscriptionStatus.PAST_DUE;
				}
				return SubscriptionStatus.SUSPENDED;
			}
		}
		return status;
	}

	public boolean isSubscriptionOperational(SubscriptionStatus effectiveStatus) {
		return effectiveStatus == SubscriptionStatus.TRIAL
				|| effectiveStatus == SubscriptionStatus.ACTIVE
				|| effectiveStatus == SubscriptionStatus.PAST_DUE;
	}

	@Transactional(readOnly = true)
	public void requireOrganizationOperationalAccess(Long organizationId) {
		if (organizationId == null) {
			return;
		}
		Organization org = organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
		if (org.getStatus() != OrganizationStatus.ACTIVE) {
			throw new SubscriptionAccessException("Organization is not active: current status is " + org.getStatus());
		}

		LocalDate today = today(org);
		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(organizationId);
		if (subOpt.isPresent()) {
			OrganizationSubscription sub = subOpt.get();
			SubscriptionStatus effectiveStatus = resolveEffectiveStatus(sub, today);
			if (!isSubscriptionOperational(effectiveStatus)) {
				throw new SubscriptionAccessException(
						"Organization subscription is " + effectiveStatus + ". Please renew or activate the subscription.");
			}
		}
	}

	@Transactional(readOnly = true)
	public void requireFeatureAccess(Long organizationId, PlatformFeature feature) {
		if (organizationId == null || feature == null) {
			return;
		}
		Organization org = organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
		if (org.getStatus() != OrganizationStatus.ACTIVE) {
			throw new SubscriptionAccessException("Organization is not active: current status is " + org.getStatus());
		}

		LocalDate today = today(org);
		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(organizationId);
		Optional<OrganizationFeatureEntitlement> overrideOpt = featureEntitlementRepository
				.findByOrganizationIdAndFeature(organizationId, feature)
				.filter(ov -> ov.isActiveOn(today));

		if (subOpt.isPresent()) {
			OrganizationSubscription sub = subOpt.get();
			SubscriptionStatus effectiveStatus = resolveEffectiveStatus(sub, today);
			if (!isSubscriptionOperational(effectiveStatus)) {
				throw new SubscriptionAccessException(
						"Organization subscription is " + effectiveStatus + ". Please renew or activate the subscription.");
			}
			if (overrideOpt.isPresent()) {
				if (!overrideOpt.get().isEnabled()) {
					throw new SubscriptionAccessException(
							"Feature '" + feature.getDisplayName() + "' is disabled for this organization.");
				}
				return;
			}
			Set<PlatformFeature> planFeatures = planRepository.findById(sub.getPlanId())
					.map(SubscriptionPlan::getIncludedFeatures)
					.orElse(Set.of());
			if (!planFeatures.contains(feature)) {
				throw new SubscriptionAccessException(
						"Current subscription plan (" + sub.getPlanNameSnapshot() + ") does not include feature: "
								+ feature.getDisplayName() + " (" + feature.name() + ")");
			}
			return;
		}

		if (overrideOpt.isPresent() && !overrideOpt.get().isEnabled()) {
			throw new SubscriptionAccessException(
					"Feature '" + feature.getDisplayName() + "' is disabled for this organization.");
		}
	}

	@Transactional(readOnly = true)
	public boolean isFeatureEnabled(Long organizationId, PlatformFeature feature) {
		try {
			requireFeatureAccess(organizationId, feature);
			return true;
		} catch (Exception ex) {
			return false;
		}
	}

	@Transactional(readOnly = true)
	public OrganizationEntitlementsResponse getOrganizationEntitlements(Long organizationId) {
		Organization org = requireOrganizationById(organizationId);
		LocalDate today = today(org);

		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(organizationId);
		SubscriptionStatus subStatus = subOpt.map(OrganizationSubscription::getStatus).orElse(null);
		SubscriptionStatus effectiveStatus = subOpt.map(s -> resolveEffectiveStatus(s, today)).orElse(null);
		boolean subOperational = subOpt.isEmpty() || isSubscriptionOperational(effectiveStatus);

		Set<PlatformFeature> planFeatures = subOpt
				.flatMap(s -> planRepository.findById(s.getPlanId()))
				.map(SubscriptionPlan::getIncludedFeatures)
				.orElseGet(() -> subOpt.isEmpty()
						? EnumSet.allOf(PlatformFeature.class)
						: Set.of());

		Map<PlatformFeature, OrganizationFeatureEntitlement> activeOverrides = featureEntitlementRepository
				.findAllByOrganizationIdOrderByFeatureAsc(organizationId).stream()
				.filter(ov -> ov.isActiveOn(today))
				.collect(Collectors.toMap(OrganizationFeatureEntitlement::getFeature, Function.identity()));

		List<FeatureEntitlementItem> items = new ArrayList<>();
		Set<PlatformFeature> enabledFeatures = new LinkedHashSet<>();

		for (PlatformFeature f : PlatformFeature.values()) {
			boolean inPlan = planFeatures.contains(f);
			OrganizationFeatureEntitlement ov = activeOverrides.get(f);
			boolean overridden = ov != null;
			boolean enabled = subOperational && (overridden ? ov.isEnabled() : inPlan);
			if (enabled) {
				enabledFeatures.add(f);
			}
			items.add(new FeatureEntitlementItem(
					f,
					f.getDisplayName(),
					enabled,
					inPlan,
					overridden,
					ov != null ? ov.getReason() : null,
					ov != null ? ov.getExpiresAt() : null
			));
		}

		return new OrganizationEntitlementsResponse(
				org.getId(),
				org.getName(),
				subOpt.map(OrganizationSubscription::getPlanId).orElse(null),
				subOpt.map(OrganizationSubscription::getPlanCodeSnapshot).orElse(null),
				subOpt.map(OrganizationSubscription::getPlanNameSnapshot).orElse(null),
				subStatus,
				effectiveStatus,
				items,
				enabledFeatures
		);
	}

	@RequirePermission(PermissionCode.PLATFORM_ENTITLEMENT_MANAGE)
	@Transactional
	public OrganizationEntitlementsResponse setOrganizationFeatureEntitlement(
			Long organizationId, UpdateFeatureEntitlementRequest request) {
		Organization org = requireOrganizationById(organizationId);
		String reason = request.reason().trim();

		OrganizationFeatureEntitlement entitlement = featureEntitlementRepository
				.findByOrganizationIdAndFeature(organizationId, request.feature())
				.orElseGet(() -> {
					OrganizationFeatureEntitlement created = new OrganizationFeatureEntitlement();
					created.setOrganizationId(organizationId);
					created.setFeature(request.feature());
					return created;
				});

		entitlement.setEnabled(Boolean.TRUE.equals(request.enabled()));
		entitlement.setReason(reason);
		entitlement.setExpiresAt(request.expiresAt());
		entitlement.setGrantedBy(resolveCurrentUserIdSafely());
		OrganizationFeatureEntitlement saved = featureEntitlementRepository.save(entitlement);

		auditService.recordAction(
				null,
				PlatformAuditAction.FEATURE_ENTITLEMENT_UPDATED,
				"FEATURE_ENTITLEMENT",
				saved.getId(),
				org.getId(),
				(saved.isEnabled() ? "Enabled" : "Disabled") + " feature " + saved.getFeature().name()
						+ " for organization " + org.getName(),
				"reason=" + reason + (request.expiresAt() != null ? ", expiresAt=" + request.expiresAt() : ""));

		return getOrganizationEntitlements(organizationId);
	}

	@RequirePermission(PermissionCode.PLATFORM_ENTITLEMENT_MANAGE)
	@Transactional
	public OrganizationEntitlementsResponse removeOrganizationFeatureEntitlement(
			Long organizationId, PlatformFeature feature) {
		Organization org = requireOrganizationById(organizationId);
		featureEntitlementRepository.findByOrganizationIdAndFeature(organizationId, feature)
				.ifPresent(existing -> {
					featureEntitlementRepository.delete(existing);
					auditService.recordAction(
							null,
							PlatformAuditAction.FEATURE_ENTITLEMENT_REMOVED,
							"FEATURE_ENTITLEMENT",
							existing.getId(),
							org.getId(),
							"Removed feature override " + feature.name() + " for organization " + org.getName(),
							"Reverted to subscription plan default");
				});
		return getOrganizationEntitlements(organizationId);
	}

	@Transactional
	public void validateStudentEnrollmentCapacity(Long organizationId, Long studentId) {
		Organization org = organizationRepository.findByIdForUpdate(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
		LocalDate today = today(org);

		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findCurrentByOrganizationIdForUpdate(organizationId);
		if (subOpt.isEmpty()) {
			return;
		}
		OrganizationSubscription sub = subOpt.get();
		SubscriptionStatus effectiveStatus = resolveEffectiveStatus(sub, today);
		if (!isSubscriptionOperational(effectiveStatus)) {
			throw new SubscriptionAccessException(
					"Organization subscription is " + effectiveStatus + ". Cannot enroll new students.");
		}
		if (studentId != null && isStudentCurrentlyCountedAsActiveEnrolled(organizationId, studentId)) {
			return;
		}
		int effectiveLimit = sub.resolveEffectiveStudentLimit(today);
		long currentEnrolled = getActiveEnrolledStudentCount(organizationId);
		if (effectiveLimit > 0 && currentEnrolled >= effectiveLimit) {
			throw new SubscriptionAccessException("Student enrollment limit reached (" + currentEnrolled + "/" + effectiveLimit
					+ ") for subscription plan " + sub.getPlanNameSnapshot());
		}
	}

	@Transactional
	public void validateStudentReactivationCapacity(Long organizationId, Long studentId) {
		if (studentId == null || !hasActiveEnrollmentInNonCompletedSession(organizationId, studentId)) {
			return;
		}
		Organization org = organizationRepository.findByIdForUpdate(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
		LocalDate today = today(org);

		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findCurrentByOrganizationIdForUpdate(organizationId);
		if (subOpt.isEmpty()) {
			return;
		}
		OrganizationSubscription sub = subOpt.get();
		int effectiveLimit = sub.resolveEffectiveStudentLimit(today);
		long currentEnrolled = getActiveEnrolledStudentCount(organizationId);
		if (effectiveLimit > 0 && currentEnrolled >= effectiveLimit) {
			throw new SubscriptionAccessException("Student enrollment limit reached (" + currentEnrolled + "/" + effectiveLimit
					+ ") for subscription plan " + sub.getPlanNameSnapshot());
		}
	}

	@RequirePermission(PermissionCode.PLATFORM_ENTITLEMENT_MANAGE)
	@Transactional
	public OrganizationUsageResponse setStudentLimitOverride(
			Long organizationId, UpdateStudentLimitOverrideRequest request) {
		Organization org = requireOrganizationById(organizationId);
		OrganizationSubscription sub = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("Organization does not have an active subscription to override"));

		String reason = request.reason().trim();
		Long actorId = resolveCurrentUserIdSafely();
		sub.setOverrideStudentLimit(request.overrideStudentLimit());
		sub.setOverrideReason(reason);
		sub.setOverrideExpiresAt(request.expiresAt());
		sub.setOverrideGrantedBy(actorId);
		subscriptionRepository.save(sub);

		saveLimitHistory(organizationId, sub, SubscriptionEventType.LIMIT_OVERRIDDEN,
				request.overrideStudentLimit(), today(org), reason, actorId);

		auditService.recordAction(
				actorId,
				PlatformAuditAction.USAGE_LIMIT_OVERRIDDEN,
				"USAGE_LIMIT",
				sub.getId(),
				organizationId,
				"Overrode student limit to " + request.overrideStudentLimit() + " for " + org.getName(),
				"planLimit=" + sub.getStudentLimitSnapshot() + ", overrideLimit=" + request.overrideStudentLimit()
						+ ", reason=" + reason);

		return getOrganizationUsage(organizationId);
	}

	@RequirePermission(PermissionCode.PLATFORM_ENTITLEMENT_MANAGE)
	@Transactional
	public OrganizationUsageResponse clearStudentLimitOverride(Long organizationId, String reason) {
		Organization org = requireOrganizationById(organizationId);
		OrganizationSubscription sub = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("Organization does not have an active subscription"));

		Long actorId = resolveCurrentUserIdSafely();
		sub.setOverrideStudentLimit(null);
		sub.setOverrideReason(null);
		sub.setOverrideExpiresAt(null);
		sub.setOverrideGrantedBy(null);
		subscriptionRepository.save(sub);

		saveLimitHistory(organizationId, sub, SubscriptionEventType.LIMIT_OVERRIDE_CLEARED,
				sub.getStudentLimitSnapshot(), today(org),
				reason != null && !reason.isBlank() ? reason.trim() : "Cleared student limit override", actorId);

		auditService.recordAction(
				actorId,
				PlatformAuditAction.USAGE_LIMIT_OVERRIDE_CLEARED,
				"USAGE_LIMIT",
				sub.getId(),
				organizationId,
				"Cleared student limit override for " + org.getName(),
				"Reverted to plan limit " + sub.getStudentLimitSnapshot());

		return getOrganizationUsage(organizationId);
	}

	@Transactional(readOnly = true)
	public OrganizationUsageResponse getOrganizationUsage(Long organizationId) {
		Organization org = requireOrganizationById(organizationId);
		LocalDate today = today(org);

		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(organizationId);
		long enrolledStudents = getActiveEnrolledStudentCount(organizationId);
		long activeProfiles = getActiveStudentProfileCount(organizationId);

		Integer planLimit = subOpt.map(OrganizationSubscription::getStudentLimitSnapshot).orElse(null);
		Integer overrideLimit = subOpt.map(OrganizationSubscription::getOverrideStudentLimit).orElse(null);
		Integer effectiveLimit = subOpt.map(s -> s.resolveEffectiveStudentLimit(today)).orElse(null);
		long remainingCapacity = effectiveLimit != null ? Math.max(0L, effectiveLimit - enrolledStudents) : 0L;
		boolean limitReached = effectiveLimit != null && effectiveLimit > 0 && enrolledStudents >= effectiveLimit;
		double utilizationPct = (effectiveLimit != null && effectiveLimit > 0)
				? BigDecimal.valueOf(enrolledStudents * 100.0 / effectiveLimit)
						.setScale(2, RoundingMode.HALF_UP).doubleValue()
				: 0.0;

		OrganizationStorageUsageResponse storage = getOrganizationStorageUsage(organizationId);

		return new OrganizationUsageResponse(
				org.getId(),
				org.getName(),
				subOpt.map(OrganizationSubscription::getPlanCodeSnapshot).orElse(null),
				subOpt.map(OrganizationSubscription::getPlanNameSnapshot).orElse(null),
				subOpt.map(s -> resolveEffectiveStatus(s, today)).orElse(null),
				enrolledStudents,
				activeProfiles,
				planLimit,
				overrideLimit,
				effectiveLimit,
				remainingCapacity,
				limitReached,
				utilizationPct,
				subOpt.map(OrganizationSubscription::getOverrideReason).orElse(null),
				subOpt.map(OrganizationSubscription::getOverrideExpiresAt).orElse(null),
				storage
		);
	}

	@Transactional(readOnly = true)
	public OrganizationStorageUsageResponse getOrganizationStorageUsage(Long organizationId) {
		Organization org = requireOrganizationById(organizationId);

		List<CategoryStorageUsageItem> categories = jdbc.query("""
				SELECT category, COUNT(*) AS file_count, COALESCE(SUM(size_bytes), 0) AS total_bytes
				FROM stored_files
				WHERE organization_id = :orgId
				GROUP BY category
				ORDER BY category ASC
				""",
				Map.of("orgId", organizationId),
				(rs, rowNum) -> new CategoryStorageUsageItem(
						FileResourceCategory.valueOf(rs.getString("category")),
						rs.getLong("file_count"),
						rs.getLong("total_bytes")));

		long totalFiles = categories.stream().mapToLong(CategoryStorageUsageItem::filesCount).sum();
		long totalBytes = categories.stream().mapToLong(CategoryStorageUsageItem::totalBytes).sum();

		return new OrganizationStorageUsageResponse(
				org.getId(),
				org.getName(),
				totalFiles,
				totalBytes,
				categories
		);
	}

	@Transactional(readOnly = true)
	public long getActiveEnrolledStudentCount(Long organizationId) {
		Long count = jdbc.queryForObject("""
				SELECT COUNT(DISTINCT se.student_id)
				FROM student_enrollments se
				JOIN students s ON s.id = se.student_id AND s.organization_id = se.organization_id
				JOIN academic_sessions a ON a.id = se.academic_session_id AND a.organization_id = se.organization_id
				WHERE se.organization_id = :orgId
				  AND se.status = 'ACTIVE'
				  AND s.status = 'ACTIVE'
				  AND a.status <> 'COMPLETED'
				""",
				Map.of("orgId", organizationId),
				Long.class);
		return count != null ? count : 0L;
	}

	@Transactional(readOnly = true)
	public long getActiveStudentProfileCount(Long organizationId) {
		Long count = jdbc.queryForObject("""
				SELECT COUNT(*)
				FROM students
				WHERE organization_id = :orgId AND status = 'ACTIVE'
				""",
				Map.of("orgId", organizationId),
				Long.class);
		return count != null ? count : 0L;
	}

	public boolean isStudentCurrentlyCountedAsActiveEnrolled(Long organizationId, Long studentId) {
		Integer count = jdbc.queryForObject("""
				SELECT COUNT(*)
				FROM student_enrollments se
				JOIN students s ON s.id = se.student_id AND s.organization_id = se.organization_id
				JOIN academic_sessions a ON a.id = se.academic_session_id AND a.organization_id = se.organization_id
				WHERE se.organization_id = :orgId
				  AND se.student_id = :studentId
				  AND se.status = 'ACTIVE'
				  AND s.status = 'ACTIVE'
				  AND a.status <> 'COMPLETED'
				""",
				Map.of("orgId", organizationId, "studentId", studentId),
				Integer.class);
		return count != null && count > 0;
	}

	public boolean hasActiveEnrollmentInNonCompletedSession(Long organizationId, Long studentId) {
		Integer count = jdbc.queryForObject("""
				SELECT COUNT(*)
				FROM student_enrollments se
				JOIN academic_sessions a ON a.id = se.academic_session_id AND a.organization_id = se.organization_id
				WHERE se.organization_id = :orgId
				  AND se.student_id = :studentId
				  AND se.status = 'ACTIVE'
				  AND a.status <> 'COMPLETED'
				""",
				Map.of("orgId", organizationId, "studentId", studentId),
				Integer.class);
		return count != null && count > 0;
	}

	private void saveLimitHistory(
			Long organizationId, OrganizationSubscription sub, SubscriptionEventType eventType,
			Integer limit, LocalDate effectiveDate, String remarks, Long actorId) {
		OrganizationSubscriptionHistory hist = new OrganizationSubscriptionHistory();
		hist.setOrganizationId(organizationId);
		hist.setSubscriptionId(sub.getId());
		hist.setEventType(eventType);
		hist.setPreviousPlanId(sub.getPlanId());
		hist.setPreviousPlanCode(sub.getPlanCodeSnapshot());
		hist.setNewPlanId(sub.getPlanId());
		hist.setNewPlanCode(sub.getPlanCodeSnapshot());
		hist.setPreviousStatus(sub.getStatus());
		hist.setNewStatus(sub.getStatus());
		hist.setBillingInterval(sub.getBillingInterval());
		hist.setContractedAmount(sub.getContractedAmount());
		hist.setStudentLimit(limit);
		hist.setEffectiveDate(effectiveDate);
		hist.setRemarks(remarks);
		hist.setActorUserId(actorId);
		subscriptionHistoryRepository.save(hist);
	}

	private Organization requireOrganizationById(Long organizationId) {
		if (organizationId == null || organizationId <= 0) {
			throw new IllegalArgumentException("Organization ID must be a positive number");
		}
		return organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
	}

	public LocalDate today(Organization org) {
		String tz = org.getTimezone();
		if (tz == null || tz.isBlank()) {
			return LocalDate.now(DEFAULT_ZONE);
		}
		try {
			return LocalDate.now(ZoneId.of(tz.trim()));
		} catch (DateTimeException ex) {
			return LocalDate.now(DEFAULT_ZONE);
		}
	}

	private Long resolveCurrentUserIdSafely() {
		try {
			return currentUser.getUserId();
		} catch (Exception ex) {
			return null;
		}
	}
}

package com.side.forge.platform.saas.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;
import com.side.forge.organization.reporting.service.ReportExportGenerator;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.dto.SaaSDtos.*;
import com.side.forge.platform.saas.entity.*;
import com.side.forge.platform.saas.enums.*;
import com.side.forge.platform.saas.repository.*;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlatformSubscriptionService {

	private static final AtomicLong INVOICE_SEQUENCE = new AtomicLong(1000L);

	private final OrganizationRepository organizationRepository;
	private final SubscriptionPlanService planService;
	private final SubscriptionEntitlementService entitlementService;
	private final OrganizationSubscriptionRepository subscriptionRepository;
	private final OrganizationSubscriptionHistoryRepository historyRepository;
	private final SubscriptionPaymentRepository paymentRepository;
	private final PlatformAuditService auditService;
	private final ReportExportGenerator exportGenerator;
	private final CurrentUserContext currentUser;

	@Transactional
	public OrganizationSubscription provisionDefaultSubscriptionOnOnboardingApproval(
			Organization organization, Long reviewedBy, ApproveOnboardingSubscriptionRequest optionalRequest) {
		SubscriptionPlan plan = (optionalRequest != null && optionalRequest.planId() != null)
				? planService.requireActivePlan(optionalRequest.planId())
				: planService.resolveDefaultTrialPlan();

		boolean isTrial = optionalRequest == null || optionalRequest.trial() == null
				|| Boolean.TRUE.equals(optionalRequest.trial())
				|| optionalRequest.billingInterval() == BillingInterval.TRIAL;

		LocalDate today = entitlementService.today(organization);
		LocalDate startDate = (optionalRequest != null && optionalRequest.startDate() != null)
				? optionalRequest.startDate()
				: today;

		BillingInterval interval;
		LocalDate periodEnd;
		BigDecimal contractedAmount;
		SubscriptionStatus initialStatus;

		if (isTrial) {
			Integer reqDays = optionalRequest != null ? optionalRequest.trialDays() : null;
			Integer planDays = plan.getDefaultTrialDays();
			int trialDays = reqDays != null
					? reqDays.intValue()
					: (planDays != null && planDays > 0 ? planDays.intValue() : 30);
			interval = BillingInterval.TRIAL;
			periodEnd = startDate.plusDays(trialDays);
			contractedAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			initialStatus = SubscriptionStatus.TRIAL;
		} else {
			interval = (optionalRequest != null && optionalRequest.billingInterval() != null)
					? optionalRequest.billingInterval()
					: BillingInterval.MONTHLY;
			periodEnd = interval == BillingInterval.YEARLY ? startDate.plusYears(1).minusDays(1) : startDate.plusMonths(1).minusDays(1);
			contractedAmount = resolvePlanPrice(plan, interval);
			initialStatus = SubscriptionStatus.ACTIVE;
		}

		supersedeExistingCurrentSubscriptions(organization.getId(), startDate);

		OrganizationSubscription sub = new OrganizationSubscription();
		sub.setOrganizationId(organization.getId());
		sub.setPlanId(plan.getId());
		sub.setPlanCodeSnapshot(plan.getCode());
		sub.setPlanNameSnapshot(plan.getName());
		sub.setStatus(initialStatus);
		sub.setBillingInterval(interval);
		sub.setContractedAmount(contractedAmount);
		sub.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		sub.setStudentLimitSnapshot(plan.getMaxStudents());
		sub.setStartDate(startDate);
		sub.setCurrentPeriodStart(startDate);
		sub.setCurrentPeriodEnd(periodEnd);
		sub.setNextRenewalDate(periodEnd.plusDays(1));
		sub.setExpiryDate(periodEnd);
		sub.setTrial(isTrial);
		sub.setCurrentSubscription(true);
		sub.setEffectiveDate(startDate);
		sub.setRemarks(optionalRequest != null && optionalRequest.remarks() != null
				? optionalRequest.remarks().trim()
				: "Default subscription provisioned upon onboarding approval");
		sub.setCreatedBy(reviewedBy);

		OrganizationSubscription saved = subscriptionRepository.save(sub);
		recordHistory(saved, isTrial ? SubscriptionEventType.TRIAL_STARTED : SubscriptionEventType.ASSIGNED,
				null, null, null, startDate, saved.getRemarks(), reviewedBy);

		auditService.recordAction(
				reviewedBy,
				PlatformAuditAction.SUBSCRIPTION_ASSIGNED,
				"ORGANIZATION_SUBSCRIPTION",
				saved.getId(),
				organization.getId(),
				"Provisioned " + (isTrial ? "trial" : "paid") + " subscription (" + plan.getCode() + ") on onboarding approval",
				"plan=" + plan.getCode() + ", status=" + saved.getStatus() + ", maxStudents=" + saved.getStudentLimitSnapshot()
						+ ", expiryDate=" + saved.getExpiryDate());
		return saved;
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE)
	@Transactional
	public OrganizationSubscriptionResponse assignSubscription(Long organizationId, AssignSubscriptionRequest request) {
		Organization org = requireOrganization(organizationId);
		SubscriptionPlan plan = planService.requireActivePlan(request.planId());
		LocalDate today = entitlementService.today(org);
		LocalDate startDate = request.startDate() != null ? request.startDate() : today;
		boolean isTrial = Boolean.TRUE.equals(request.trial()) || request.billingInterval() == BillingInterval.TRIAL;

		BillingInterval interval = isTrial ? BillingInterval.TRIAL : request.billingInterval();
		LocalDate periodEnd;
		BigDecimal contracted;
		SubscriptionStatus status;

		if (isTrial) {
			Integer reqDays = request.trialDays();
			Integer planDays = plan.getDefaultTrialDays();
			int trialDays = reqDays != null
					? reqDays.intValue()
					: (planDays != null && planDays > 0 ? planDays.intValue() : 30);
			periodEnd = startDate.plusDays(trialDays);
			contracted = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			status = SubscriptionStatus.TRIAL;
		} else {
			periodEnd = interval == BillingInterval.YEARLY
					? startDate.plusYears(1).minusDays(1)
					: startDate.plusMonths(1).minusDays(1);
			contracted = request.contractedAmount() != null
					? request.contractedAmount().setScale(2, RoundingMode.HALF_UP)
					: resolvePlanPrice(plan, interval);
			status = SubscriptionStatus.ACTIVE;
		}

		supersedeExistingCurrentSubscriptions(organizationId, startDate);

		Long actorId = resolveCurrentUserIdSafely();
		OrganizationSubscription sub = new OrganizationSubscription();
		sub.setOrganizationId(organizationId);
		sub.setPlanId(plan.getId());
		sub.setPlanCodeSnapshot(plan.getCode());
		sub.setPlanNameSnapshot(plan.getName());
		sub.setStatus(status);
		sub.setBillingInterval(interval);
		sub.setContractedAmount(contracted);
		sub.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		sub.setStudentLimitSnapshot(plan.getMaxStudents());
		sub.setStartDate(startDate);
		sub.setCurrentPeriodStart(startDate);
		sub.setCurrentPeriodEnd(periodEnd);
		sub.setNextRenewalDate(periodEnd.plusDays(1));
		sub.setExpiryDate(periodEnd);
		sub.setTrial(isTrial);
		sub.setCurrentSubscription(true);
		sub.setEffectiveDate(startDate);
		sub.setRemarks(normalizeOptional(request.remarks()));
		sub.setCreatedBy(actorId);

		OrganizationSubscription saved = subscriptionRepository.save(sub);
		recordHistory(saved, isTrial ? SubscriptionEventType.TRIAL_STARTED : SubscriptionEventType.ASSIGNED,
				null, null, null, startDate, saved.getRemarks(), actorId);

		auditService.recordAction(
				actorId,
				PlatformAuditAction.SUBSCRIPTION_ASSIGNED,
				"ORGANIZATION_SUBSCRIPTION",
				saved.getId(),
				organizationId,
				"Assigned subscription plan " + plan.getCode() + " (" + interval + ") to " + org.getName(),
				"contractedAmount=" + contracted + ", maxStudents=" + plan.getMaxStudents()
						+ ", startDate=" + startDate + ", expiryDate=" + periodEnd);
		return toResponse(saved, org);
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE)
	@Transactional
	public OrganizationSubscriptionResponse changeSubscriptionPlan(
			Long organizationId, ChangeSubscriptionPlanRequest request) {
		Organization org = requireOrganization(organizationId);
		OrganizationSubscription current = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("No current subscription found for organization"));
		SubscriptionPlan newPlan = planService.requireActivePlan(request.newPlanId());

		LocalDate today = entitlementService.today(org);
		LocalDate effectiveDate = request.effectiveDate() != null ? request.effectiveDate() : today;
		BillingInterval interval = request.billingInterval() != null
				? request.billingInterval()
				: (current.getBillingInterval() == BillingInterval.TRIAL ? BillingInterval.MONTHLY : current.getBillingInterval());
		if (interval == BillingInterval.TRIAL) {
			interval = BillingInterval.MONTHLY;
		}

		boolean isUpgrade = newPlan.getMaxStudents() >= current.getStudentLimitSnapshot();
		SubscriptionEventType eventType = isUpgrade ? SubscriptionEventType.UPGRADED : SubscriptionEventType.DOWNGRADED;
		PlatformAuditAction auditAction = isUpgrade
				? PlatformAuditAction.SUBSCRIPTION_UPGRADED
				: PlatformAuditAction.SUBSCRIPTION_DOWNGRADED;

		Long prevPlanId = current.getPlanId();
		String prevPlanCode = current.getPlanCodeSnapshot();
		SubscriptionStatus prevStatus = current.getStatus();

		current.setCurrentSubscription(false);
		current.setEndedDate(effectiveDate);
		subscriptionRepository.save(current);

		LocalDate periodEnd = interval == BillingInterval.YEARLY
				? effectiveDate.plusYears(1).minusDays(1)
				: effectiveDate.plusMonths(1).minusDays(1);
		BigDecimal contracted = request.contractedAmount() != null
				? request.contractedAmount().setScale(2, RoundingMode.HALF_UP)
				: resolvePlanPrice(newPlan, interval);

		Long actorId = resolveCurrentUserIdSafely();
		OrganizationSubscription nextSub = new OrganizationSubscription();
		nextSub.setOrganizationId(organizationId);
		nextSub.setPlanId(newPlan.getId());
		nextSub.setPlanCodeSnapshot(newPlan.getCode());
		nextSub.setPlanNameSnapshot(newPlan.getName());
		nextSub.setStatus(SubscriptionStatus.ACTIVE);
		nextSub.setBillingInterval(interval);
		nextSub.setContractedAmount(contracted);
		nextSub.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		nextSub.setStudentLimitSnapshot(newPlan.getMaxStudents());
		nextSub.setOverrideStudentLimit(current.getOverrideStudentLimit());
		nextSub.setOverrideReason(current.getOverrideReason());
		nextSub.setOverrideExpiresAt(current.getOverrideExpiresAt());
		nextSub.setOverrideGrantedBy(current.getOverrideGrantedBy());
		nextSub.setStartDate(current.getStartDate());
		nextSub.setCurrentPeriodStart(effectiveDate);
		nextSub.setCurrentPeriodEnd(periodEnd);
		nextSub.setNextRenewalDate(periodEnd.plusDays(1));
		nextSub.setExpiryDate(periodEnd);
		nextSub.setTrial(false);
		nextSub.setCurrentSubscription(true);
		nextSub.setEffectiveDate(effectiveDate);
		nextSub.setRemarks(normalizeOptional(request.remarks()));
		nextSub.setCreatedBy(actorId);

		OrganizationSubscription saved = subscriptionRepository.save(nextSub);
		recordHistory(saved, eventType, prevPlanId, prevPlanCode, prevStatus, effectiveDate, saved.getRemarks(), actorId);

		auditService.recordAction(
				actorId,
				auditAction,
				"ORGANIZATION_SUBSCRIPTION",
				saved.getId(),
				organizationId,
				(isUpgrade ? "Upgraded" : "Downgraded") + " subscription from " + prevPlanCode + " to " + newPlan.getCode()
						+ " for " + org.getName(),
				"effectiveDate=" + effectiveDate + ", interval=" + interval + ", contractedAmount=" + contracted
						+ ", newLimit=" + newPlan.getMaxStudents());
		return toResponse(saved, org);
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE)
	@Transactional
	public OrganizationSubscriptionResponse renewSubscription(Long organizationId, RenewSubscriptionRequest request) {
		Organization org = requireOrganization(organizationId);
		return executeRenewal(org, request);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public OrganizationSubscriptionResponse renewSubscriptionFromSchoolBillingPortal(
			Long organizationId, RenewSubscriptionRequest request) {
		Organization org = requireOrganization(organizationId);
		if (org.getStatus() == com.side.forge.organization.entity.OrganizationStatus.SUSPENDED) {
			org.setStatus(com.side.forge.organization.entity.OrganizationStatus.ACTIVE);
			org = organizationRepository.saveAndFlush(org);
		}
		return executeRenewal(org, request);
	}

	private OrganizationSubscriptionResponse executeRenewal(Organization org, RenewSubscriptionRequest request) {
		Long organizationId = org.getId();
		OrganizationSubscription current = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("No current subscription found for organization"));
		SubscriptionPlan plan = planService.requirePlan(current.getPlanId());

		LocalDate today = entitlementService.today(org);
		LocalDate periodStart;
		if (request != null && request.renewalStartDate() != null) {
			periodStart = request.renewalStartDate();
		} else if (current.getExpiryDate() != null && !current.isTrial()
				&& !today.isAfter(current.getExpiryDate().plusDays(SubscriptionEntitlementService.GRACE_PERIOD_DAYS))) {
			periodStart = current.getExpiryDate().plusDays(1);
		} else {
			periodStart = today;
		}

		BillingInterval interval = request != null && request.billingInterval() != null
				? request.billingInterval()
				: (current.getBillingInterval() == BillingInterval.TRIAL ? BillingInterval.MONTHLY : current.getBillingInterval());
		if (interval == BillingInterval.TRIAL) {
			interval = BillingInterval.MONTHLY;
		}

		LocalDate periodEnd = (request != null && request.periodMonths() != null)
				? periodStart.plusMonths(request.periodMonths()).minusDays(1)
				: (interval == BillingInterval.YEARLY ? periodStart.plusYears(1).minusDays(1) : periodStart.plusMonths(1).minusDays(1));
		if (periodEnd.isBefore(periodStart)) {
			throw new IllegalArgumentException("Renewal period end cannot be before period start");
		}

		BigDecimal contracted = request != null && request.contractedAmount() != null
				? request.contractedAmount().setScale(2, RoundingMode.HALF_UP)
				: resolvePlanPrice(plan, interval);

		SubscriptionStatus prevStatus = current.getStatus();
		current.setStatus(SubscriptionStatus.ACTIVE);
		current.setBillingInterval(interval);
		current.setContractedAmount(contracted);
		current.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		current.setCurrentPeriodStart(periodStart);
		current.setCurrentPeriodEnd(periodEnd);
		current.setNextRenewalDate(periodEnd.plusDays(1));
		current.setExpiryDate(periodEnd);
		current.setTrial(false);
		current.setCancelledAt(null);
		current.setCancellationReason(null);
		if (request != null && request.remarks() != null && !request.remarks().isBlank()) {
			current.setRemarks(request.remarks().trim());
		}

		Long actorId = resolveCurrentUserIdSafely();
		OrganizationSubscription saved = subscriptionRepository.save(current);
		recordHistory(saved, SubscriptionEventType.RENEWED, current.getPlanId(), current.getPlanCodeSnapshot(),
				prevStatus, periodStart, request != null ? normalizeOptional(request.remarks()) : "Manual renewal", actorId);

		auditService.recordAction(
				actorId,
				PlatformAuditAction.SUBSCRIPTION_RENEWED,
				"ORGANIZATION_SUBSCRIPTION",
				saved.getId(),
				organizationId,
				"Renewed subscription (" + saved.getPlanCodeSnapshot() + ") for " + org.getName()
						+ " through " + periodEnd,
				"period=" + periodStart + ".." + periodEnd + ", contractedAmount=" + contracted);
		return toResponse(saved, org);
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE)
	@Transactional
	public OrganizationSubscriptionResponse cancelSubscription(Long organizationId, CancelSubscriptionRequest request) {
		Organization org = requireOrganization(organizationId);
		OrganizationSubscription current = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("No current subscription found for organization"));

		LocalDate today = entitlementService.today(org);
		LocalDate effectiveDate = request.effectiveDate() != null ? request.effectiveDate() : today;
		SubscriptionStatus prevStatus = current.getStatus();

		current.setStatus(SubscriptionStatus.CANCELLED);
		current.setCancelledAt(Instant.now());
		current.setCancellationReason(request.reason().trim());
		current.setEndedDate(effectiveDate);

		Long actorId = resolveCurrentUserIdSafely();
		OrganizationSubscription saved = subscriptionRepository.save(current);
		recordHistory(saved, SubscriptionEventType.CANCELLED, current.getPlanId(), current.getPlanCodeSnapshot(),
				prevStatus, effectiveDate, request.reason().trim(), actorId);

		auditService.recordAction(
				actorId,
				PlatformAuditAction.SUBSCRIPTION_CANCELLED,
				"ORGANIZATION_SUBSCRIPTION",
				saved.getId(),
				organizationId,
				"Cancelled subscription (" + saved.getPlanCodeSnapshot() + ") for " + org.getName(),
				"reason=" + request.reason().trim() + ", effectiveDate=" + effectiveDate);
		return toResponse(saved, org);
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE)
	@Transactional
	public OrganizationSubscriptionResponse updateSubscriptionStatus(
			Long organizationId, UpdateSubscriptionStatusRequest request) {
		Organization org = requireOrganization(organizationId);
		OrganizationSubscription current = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("No current subscription found for organization"));

		LocalDate today = entitlementService.today(org);
		LocalDate effectiveDate = request.effectiveDate() != null ? request.effectiveDate() : today;
		SubscriptionStatus prevStatus = current.getStatus();
		SubscriptionStatus nextStatus = request.status();

		current.setStatus(nextStatus);
		if (nextStatus == SubscriptionStatus.CANCELLED) {
			current.setCancelledAt(Instant.now());
			current.setCancellationReason(request.reason().trim());
			current.setEndedDate(effectiveDate);
		}

		SubscriptionEventType eventType = switch (nextStatus) {
			case SUSPENDED -> SubscriptionEventType.SUSPENDED;
			case PAST_DUE -> SubscriptionEventType.PAST_DUE;
			case EXPIRED -> SubscriptionEventType.EXPIRED;
			case CANCELLED -> SubscriptionEventType.CANCELLED;
			default -> SubscriptionEventType.REACTIVATED;
		};

		Long actorId = resolveCurrentUserIdSafely();
		OrganizationSubscription saved = subscriptionRepository.save(current);
		recordHistory(saved, eventType, current.getPlanId(), current.getPlanCodeSnapshot(),
				prevStatus, effectiveDate, request.reason().trim(), actorId);

		auditService.recordAction(
				actorId,
				PlatformAuditAction.SUBSCRIPTION_STATUS_CHANGED,
				"ORGANIZATION_SUBSCRIPTION",
				saved.getId(),
				organizationId,
				"Updated subscription status from " + prevStatus + " to " + nextStatus + " for " + org.getName(),
				"reason=" + request.reason().trim() + ", effectiveDate=" + effectiveDate);
		return toResponse(saved, org);
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_VIEW)
	@Transactional(readOnly = true)
	public OrganizationSubscriptionResponse getCurrentSubscription(Long organizationId) {
		Organization org = requireOrganization(organizationId);
		OrganizationSubscription current = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("No current subscription found for organization: " + organizationId));
		return toResponse(current, org);
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_VIEW)
	@Transactional(readOnly = true)
	public List<OrganizationSubscriptionHistoryItem> getSubscriptionHistory(Long organizationId) {
		requireOrganization(organizationId);
		return historyRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(organizationId)
				.stream()
				.map(this::toHistoryResponse)
				.toList();
	}

	@RequirePermission(PermissionCode.PLATFORM_SUBSCRIPTION_VIEW)
	@Transactional(readOnly = true)
	public List<OrganizationSubscriptionResponse> getAllOrganizationSubscriptionRecords(Long organizationId) {
		Organization org = requireOrganization(organizationId);
		return subscriptionRepository.findAllByOrganizationIdOrderByIdDesc(organizationId)
				.stream()
				.map(s -> toResponse(s, org))
				.toList();
	}

	@RequirePermission(PermissionCode.PLATFORM_BILLING_MANAGE)
	@Transactional
	public SubscriptionPaymentResponse recordManualPayment(
			Long organizationId, RecordSubscriptionPaymentRequest request) {
		Organization org = requireOrganization(organizationId);
		OrganizationSubscription current = subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.orElseThrow(() -> new IllegalStateException("No current subscription found for organization"));

		LocalDate today = entitlementService.today(org);
		LocalDate paymentDate = request.paymentDate() != null ? request.paymentDate() : today;
		BigDecimal received = request.amountReceived().setScale(2, RoundingMode.HALF_UP);
		BigDecimal billed = request.billedAmount() != null
				? request.billedAmount().setScale(2, RoundingMode.HALF_UP)
				: (current.getContractedAmount().compareTo(BigDecimal.ZERO) > 0 ? current.getContractedAmount() : received);

		LocalDate periodStart = request.billingPeriodStart() != null
				? request.billingPeriodStart()
				: current.getCurrentPeriodStart();
		LocalDate periodEnd = request.billingPeriodEnd() != null
				? request.billingPeriodEnd()
				: current.getCurrentPeriodEnd();
		if (periodEnd.isBefore(periodStart)) {
			throw new IllegalArgumentException("Billing period end cannot be before period start");
		}

		SubscriptionPaymentStatus paymentStatus = received.compareTo(billed) >= 0
				? SubscriptionPaymentStatus.PAID
				: (received.compareTo(BigDecimal.ZERO) > 0 ? SubscriptionPaymentStatus.PARTIAL : SubscriptionPaymentStatus.PENDING);

		Long actorId = resolveCurrentUserIdSafely();
		SubscriptionPayment payment = new SubscriptionPayment();
		payment.setOrganizationId(organizationId);
		payment.setSubscriptionId(current.getId());
		payment.setInvoiceNumber(generateInvoiceNumber(organizationId, paymentDate));
		payment.setBillingPeriodStart(periodStart);
		payment.setBillingPeriodEnd(periodEnd);
		payment.setBilledAmount(billed);
		payment.setAmountReceived(received);
		payment.setPaymentDate(paymentDate);
		payment.setPaymentMethod(request.paymentMethod());
		payment.setReferenceNumber(normalizeOptional(request.referenceNumber()));
		payment.setStatus(paymentStatus);
		payment.setRemarks(normalizeOptional(request.remarks()));
		payment.setRecordedBy(actorId);

		SubscriptionPayment savedPayment = paymentRepository.save(payment);
		applyPaymentToSubscription(org, current, savedPayment, Boolean.TRUE.equals(request.renewSubscription()), actorId);
		return toPaymentResponse(savedPayment, org.getName());
	}

	private void applyPaymentToSubscription(
			Organization org, OrganizationSubscription current, SubscriptionPayment payment,
			boolean renewSubscription, Long actorId) {
		SubscriptionStatus prevStatus = current.getStatus();
		if (renewSubscription) {
			current.setCurrentPeriodStart(payment.getBillingPeriodStart());
			current.setCurrentPeriodEnd(payment.getBillingPeriodEnd());
			current.setNextRenewalDate(payment.getBillingPeriodEnd().plusDays(1));
			current.setExpiryDate(payment.getBillingPeriodEnd());
			current.setContractedAmount(payment.getBilledAmount());
			current.setAmountPaid(payment.getAmountReceived());
			current.setStatus(SubscriptionStatus.ACTIVE);
			current.setTrial(false);
		} else {
			current.setAmountPaid(current.getAmountPaid().add(payment.getAmountReceived()));
			if (current.getContractedAmount().compareTo(BigDecimal.ZERO) == 0 && current.isTrial()) {
				current.setContractedAmount(payment.getBilledAmount());
				current.setTrial(false);
				current.setStatus(SubscriptionStatus.ACTIVE);
			} else if (current.resolveOutstandingAmount().compareTo(BigDecimal.ZERO) == 0
					&& (current.getStatus() == SubscriptionStatus.PAST_DUE
							|| current.getStatus() == SubscriptionStatus.EXPIRED
							|| current.getStatus() == SubscriptionStatus.TRIAL)) {
				current.setStatus(SubscriptionStatus.ACTIVE);
				current.setTrial(false);
				if (payment.getBillingPeriodEnd().isAfter(current.getExpiryDate())) {
					current.setCurrentPeriodEnd(payment.getBillingPeriodEnd());
					current.setExpiryDate(payment.getBillingPeriodEnd());
					current.setNextRenewalDate(payment.getBillingPeriodEnd().plusDays(1));
				}
			}
		}

		subscriptionRepository.save(current);
		if (prevStatus != current.getStatus() || renewSubscription) {
			recordHistory(current, renewSubscription ? SubscriptionEventType.RENEWED : SubscriptionEventType.REACTIVATED,
					current.getPlanId(), current.getPlanCodeSnapshot(), prevStatus, payment.getPaymentDate(),
					"Payment recorded: " + payment.getInvoiceNumber(), actorId);
		}

		auditService.recordAction(
				actorId,
				PlatformAuditAction.SUBSCRIPTION_PAYMENT_RECORDED,
				"SUBSCRIPTION_PAYMENT",
				payment.getId(),
				org.getId(),
				"Recorded manual subscription payment " + payment.getInvoiceNumber() + " (" + payment.getAmountReceived()
						+ " via " + payment.getPaymentMethod() + ") for " + org.getName(),
				"billed=" + payment.getBilledAmount() + ", received=" + payment.getAmountReceived()
						+ ", status=" + payment.getStatus());
	}

	@RequirePermission(PermissionCode.PLATFORM_BILLING_VIEW)
	@Transactional(readOnly = true)
	public List<SubscriptionPaymentResponse> getOrganizationPayments(Long organizationId) {
		Organization org = requireOrganization(organizationId);
		return paymentRepository.findAllByOrganizationIdOrderByPaymentDateDescIdDesc(organizationId)
				.stream()
				.map(p -> toPaymentResponse(p, org.getName()))
				.toList();
	}

	@RequirePermission(PermissionCode.PLATFORM_BILLING_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<SubscriptionPaymentResponse> getAllPayments(
			Long organizationId, SubscriptionPaymentStatus status, int page, int size) {
		int safePage = Math.max(0, page);
		int safeSize = Math.min(100, Math.max(1, size));
		Page<SubscriptionPayment> p = paymentRepository.findFilteredPayments(
				organizationId, status, PageRequest.of(safePage, safeSize));

		Set<Long> orgIds = p.getContent().stream()
				.map(SubscriptionPayment::getOrganizationId)
				.collect(Collectors.toSet());
		Map<Long, String> orgNames = orgIds.isEmpty() ? Map.of()
				: organizationRepository.findAllById(orgIds).stream()
						.collect(Collectors.toMap(Organization::getId, Organization::getName));

		return PagedResponse.from(p.map(pay -> toPaymentResponse(pay, orgNames.getOrDefault(pay.getOrganizationId(), "Unknown"))));
	}

	@RequirePermission(PermissionCode.PLATFORM_BILLING_VIEW)
	@Transactional(readOnly = true)
	public OrganizationBillingSummaryResponse getBillingSummary(Long organizationId) {
		Organization org = requireOrganization(organizationId);
		return buildBillingSummaryForOrganization(org);
	}

	@Transactional(readOnly = true)
	public OrganizationBillingSummaryResponse buildBillingSummaryForOrganization(Organization org) {
		LocalDate today = entitlementService.today(org);
		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(org.getId());
		List<SubscriptionPaymentResponse> payments = paymentRepository
				.findAllByOrganizationIdOrderByPaymentDateDescIdDesc(org.getId())
				.stream()
				.map(p -> toPaymentResponse(p, org.getName()))
				.toList();

		BigDecimal totalRevenue = paymentRepository.sumRevenueByOrganization(org.getId());
		SubscriptionStatus status = subOpt.map(s -> entitlementService.resolveEffectiveStatus(s, today)).orElse(null);

		return new OrganizationBillingSummaryResponse(
				org.getId(),
				org.getName(),
				status,
				subOpt.map(OrganizationSubscription::getPlanCodeSnapshot).orElse(null),
				subOpt.map(OrganizationSubscription::getPlanNameSnapshot).orElse(null),
				subOpt.map(OrganizationSubscription::getBillingInterval).orElse(null),
				subOpt.map(OrganizationSubscription::getContractedAmount).orElse(BigDecimal.ZERO),
				subOpt.map(OrganizationSubscription::getAmountPaid).orElse(BigDecimal.ZERO),
				subOpt.map(OrganizationSubscription::resolveOutstandingAmount).orElse(BigDecimal.ZERO),
				totalRevenue,
				subOpt.map(OrganizationSubscription::getCurrentPeriodStart).orElse(null),
				subOpt.map(OrganizationSubscription::getCurrentPeriodEnd).orElse(null),
				subOpt.map(OrganizationSubscription::getNextRenewalDate).orElse(null),
				subOpt.map(OrganizationSubscription::getExpiryDate).orElse(null),
				payments
		);
	}

	@RequirePermission(PermissionCode.PLATFORM_BILLING_VIEW)
	@Transactional(readOnly = true)
	public SubscriptionPaymentResponse getPaymentReceipt(Long organizationId, Long paymentId) {
		Organization org = requireOrganization(organizationId);
		SubscriptionPayment payment = paymentRepository.findByIdAndOrganizationId(paymentId, organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Subscription payment not found: " + paymentId));
		return toPaymentResponse(payment, org.getName());
	}

	@RequirePermission(PermissionCode.PLATFORM_BILLING_VIEW)
	@Transactional(readOnly = true)
	public ExportDocument downloadPaymentReceipt(Long organizationId, Long paymentId, ExportFormat format) {
		Organization org = requireOrganization(organizationId);
		SubscriptionPayment payment = paymentRepository.findByIdAndOrganizationId(paymentId, organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Subscription payment not found: " + paymentId));
		return generateReceiptExportDocument(org, payment, format);
	}

	@Transactional(readOnly = true)
	public ExportDocument generateReceiptExportDocument(
			Organization org, SubscriptionPayment payment, ExportFormat format) {
		ExportFormat safeFormat = format != null ? format : ExportFormat.PDF;
		BigDecimal outstanding = payment.getBilledAmount().subtract(payment.getAmountReceived()).max(BigDecimal.ZERO);
		List<String> headers = List.of(
				"Invoice #", "Organization", "Billing Period", "Amount Billed",
				"Amount Received", "Outstanding", "Payment Date", "Method", "Reference", "Status");
		List<List<String>> rows = List.of(List.of(
				payment.getInvoiceNumber(),
				org.getName(),
				payment.getBillingPeriodStart() + " to " + payment.getBillingPeriodEnd(),
				payment.getBilledAmount().toPlainString(),
				payment.getAmountReceived().toPlainString(),
				outstanding.toPlainString(),
				payment.getPaymentDate().toString(),
				payment.getPaymentMethod().name(),
				payment.getReferenceNumber() != null ? payment.getReferenceNumber() : "-",
				payment.getStatus().name()
		));
		Map<String, String> summaryMetrics = new LinkedHashMap<>();
		summaryMetrics.put("Invoice Number", payment.getInvoiceNumber());
		summaryMetrics.put("Billed Amount", payment.getBilledAmount().toPlainString());
		summaryMetrics.put("Amount Received", payment.getAmountReceived().toPlainString());
		summaryMetrics.put("Outstanding Balance", outstanding.toPlainString());
		return exportGenerator.generate(
				safeFormat,
				"subscription-receipt-" + payment.getInvoiceNumber().toLowerCase(Locale.ROOT),
				org.getName(),
				"SaaS Subscription Receipt - " + payment.getInvoiceNumber(),
				null,
				payment.getBillingPeriodStart(),
				payment.getBillingPeriodEnd(),
				headers,
				rows,
				summaryMetrics);
	}

	private void supersedeExistingCurrentSubscriptions(Long organizationId, LocalDate endedDate) {
		subscriptionRepository.findCurrentByOrganizationIdForUpdate(organizationId)
				.ifPresent(existing -> {
					existing.setCurrentSubscription(false);
					existing.setEndedDate(endedDate);
					subscriptionRepository.save(existing);
				});
	}

	private void recordHistory(
			OrganizationSubscription sub, SubscriptionEventType eventType,
			Long prevPlanId, String prevPlanCode, SubscriptionStatus prevStatus,
			LocalDate effectiveDate, String remarks, Long actorId) {
		OrganizationSubscriptionHistory h = new OrganizationSubscriptionHistory();
		h.setOrganizationId(sub.getOrganizationId());
		h.setSubscriptionId(sub.getId());
		h.setEventType(eventType);
		h.setPreviousPlanId(prevPlanId);
		h.setPreviousPlanCode(prevPlanCode);
		h.setNewPlanId(sub.getPlanId());
		h.setNewPlanCode(sub.getPlanCodeSnapshot());
		h.setPreviousStatus(prevStatus);
		h.setNewStatus(sub.getStatus());
		h.setBillingInterval(sub.getBillingInterval());
		h.setContractedAmount(sub.getContractedAmount());
		h.setStudentLimit(sub.getStudentLimitSnapshot());
		h.setEffectiveDate(effectiveDate);
		h.setRemarks(remarks);
		h.setActorUserId(actorId);
		historyRepository.save(h);
	}

	public OrganizationSubscriptionResponse toResponse(OrganizationSubscription sub, Organization org) {
		LocalDate today = entitlementService.today(org);
		SubscriptionStatus effectiveStatus = entitlementService.resolveEffectiveStatus(sub, today);
		return new OrganizationSubscriptionResponse(
				sub.getId(),
				sub.getOrganizationId(),
				org.getName(),
				sub.getPlanId(),
				sub.getPlanCodeSnapshot(),
				sub.getPlanNameSnapshot(),
				sub.getStatus(),
				effectiveStatus,
				sub.getBillingInterval(),
				sub.getContractedAmount(),
				sub.getAmountPaid(),
				sub.resolveOutstandingAmount(),
				sub.getStudentLimitSnapshot(),
				sub.getOverrideStudentLimit(),
				sub.resolveEffectiveStudentLimit(today),
				sub.getOverrideReason(),
				sub.getOverrideExpiresAt(),
				sub.getStartDate(),
				sub.getCurrentPeriodStart(),
				sub.getCurrentPeriodEnd(),
				sub.getNextRenewalDate(),
				sub.getExpiryDate(),
				sub.isTrial(),
				sub.isCurrentSubscription(),
				sub.getEffectiveDate(),
				sub.getEndedDate(),
				sub.getCancelledAt(),
				sub.getCancellationReason(),
				sub.getRemarks(),
				sub.getCreatedAt(),
				sub.getUpdatedAt()
		);
	}

	private OrganizationSubscriptionHistoryItem toHistoryResponse(OrganizationSubscriptionHistory h) {
		return new OrganizationSubscriptionHistoryItem(
				h.getId(),
				h.getOrganizationId(),
				h.getSubscriptionId(),
				h.getEventType(),
				h.getPreviousPlanId(),
				h.getPreviousPlanCode(),
				h.getNewPlanId(),
				h.getNewPlanCode(),
				h.getPreviousStatus(),
				h.getNewStatus(),
				h.getBillingInterval(),
				h.getContractedAmount(),
				h.getStudentLimit(),
				h.getEffectiveDate(),
				h.getRemarks(),
				h.getActorUserId(),
				h.getCreatedAt()
		);
	}

	public SubscriptionPaymentResponse toPaymentResponse(SubscriptionPayment p, String orgName) {
		return new SubscriptionPaymentResponse(
				p.getId(),
				p.getOrganizationId(),
				orgName,
				p.getSubscriptionId(),
				p.getInvoiceNumber(),
				p.getPaymentDate(),
				p.getBilledAmount(),
				p.getAmountReceived(),
				p.getPaymentMethod(),
				p.getReferenceNumber(),
				p.getBillingPeriodStart(),
				p.getBillingPeriodEnd(),
				p.getStatus(),
				p.getRemarks(),
				p.getRecordedBy(),
				p.getCreatedAt()
		);
	}

	private BigDecimal resolvePlanPrice(SubscriptionPlan plan, BillingInterval interval) {
		if (interval == BillingInterval.YEARLY) {
			return plan.getYearlyPrice().setScale(2, RoundingMode.HALF_UP);
		}
		if (interval == BillingInterval.MONTHLY) {
			return plan.getMonthlyPrice().setScale(2, RoundingMode.HALF_UP);
		}
		return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
	}

	private String generateInvoiceNumber(Long organizationId, LocalDate paymentDate) {
		long seq = INVOICE_SEQUENCE.incrementAndGet();
		return String.format("SUB-INV-%d-%d-%d", paymentDate.getYear(), organizationId, seq);
	}

	private Organization requireOrganization(Long organizationId) {
		if (organizationId == null || organizationId <= 0) {
			throw new IllegalArgumentException("Organization ID must be a positive number");
		}
		return organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
	}

	private String normalizeOptional(String s) {
		if (s == null || s.isBlank()) {
			return null;
		}
		return s.trim();
	}

	private Long resolveCurrentUserIdSafely() {
		try {
			return currentUser.getUserId();
		} catch (Exception ex) {
			return null;
		}
	}
}

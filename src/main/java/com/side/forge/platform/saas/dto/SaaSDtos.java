package com.side.forge.platform.saas.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import com.side.forge.authorization.entity.MembershipStatus;
import com.side.forge.organization.entity.BoardAffiliation;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.onboarding.entity.OnboardingStatus;
import com.side.forge.platform.saas.enums.BillingInterval;
import com.side.forge.platform.saas.enums.PlatformAuditAction;
import com.side.forge.platform.saas.enums.PlatformFeature;
import com.side.forge.platform.saas.enums.SubscriptionEventType;
import com.side.forge.platform.saas.enums.SubscriptionPaymentMethod;
import com.side.forge.platform.saas.enums.SubscriptionPaymentStatus;
import com.side.forge.platform.saas.enums.SubscriptionStatus;
import com.side.forge.storage.entity.FileResourceCategory;
import com.side.forge.user.entity.UserStatus;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class SaaSDtos {

	private SaaSDtos() {
	}

	// =========================================================================
	// 1. Subscription Plans
	// =========================================================================

	public record CreateSubscriptionPlanRequest(
			@NotBlank @Size(max = 60) String code,
			@NotBlank @Size(max = 120) String name,
			@Size(max = 1000) String description,
			@NotNull @DecimalMin("0.00") BigDecimal monthlyPrice,
			@NotNull @DecimalMin("0.00") BigDecimal yearlyPrice,
			@NotNull @Positive Integer maxStudents,
			@NotEmpty Set<PlatformFeature> includedFeatures,
			Boolean defaultTrialPlan,
			@Positive Integer defaultTrialDays,
			@Positive Integer displayOrder,
			@Size(max = 2000) String metadata
	) {
	}

	public record UpdateSubscriptionPlanRequest(
			@NotBlank @Size(max = 120) String name,
			@Size(max = 1000) String description,
			@NotNull @DecimalMin("0.00") BigDecimal monthlyPrice,
			@NotNull @DecimalMin("0.00") BigDecimal yearlyPrice,
			@NotNull @Positive Integer maxStudents,
			@NotEmpty Set<PlatformFeature> includedFeatures,
			Boolean defaultTrialPlan,
			@Positive Integer defaultTrialDays,
			@Positive Integer displayOrder,
			@Size(max = 2000) String metadata
	) {
	}

	public record SubscriptionPlanResponse(
			Long id,
			String code,
			String name,
			String description,
			BigDecimal monthlyPrice,
			BigDecimal yearlyPrice,
			Integer maxStudents,
			boolean active,
			boolean defaultTrialPlan,
			Integer defaultTrialDays,
			Integer displayOrder,
			String metadata,
			Set<PlatformFeature> includedFeatures,
			Instant createdAt,
			Instant updatedAt
	) {
	}

	public record PlatformFeatureCatalogItem(
			PlatformFeature code,
			String displayName,
			String description
	) {
	}

	// =========================================================================
	// 2. Subscriptions & Billing
	// =========================================================================

	public record ApproveOnboardingSubscriptionRequest(
			Long planId,
			BillingInterval billingInterval,
			Boolean trial,
			@Positive Integer trialDays,
			LocalDate startDate,
			@Size(max = 1000) String remarks
	) {
	}

	public record AssignSubscriptionRequest(
			@NotNull @Positive Long planId,
			@NotNull BillingInterval billingInterval,
			Boolean trial,
			@Positive Integer trialDays,
			LocalDate startDate,
			@DecimalMin("0.00") BigDecimal contractedAmount,
			@Size(max = 1000) String remarks
	) {
	}

	public record ChangeSubscriptionPlanRequest(
			@NotNull @Positive Long newPlanId,
			BillingInterval billingInterval,
			LocalDate effectiveDate,
			@DecimalMin("0.00") BigDecimal contractedAmount,
			@Size(max = 1000) String remarks
	) {
	}

	public record RenewSubscriptionRequest(
			BillingInterval billingInterval,
			LocalDate renewalStartDate,
			@Positive Integer periodMonths,
			@DecimalMin("0.00") BigDecimal contractedAmount,
			@Size(max = 1000) String remarks
	) {
	}

	public record CancelSubscriptionRequest(
			@NotBlank @Size(max = 500) String reason,
			LocalDate effectiveDate
	) {
	}

	public record UpdateSubscriptionStatusRequest(
			@NotNull SubscriptionStatus status,
			@NotBlank @Size(max = 500) String reason,
			LocalDate effectiveDate
	) {
	}

	public record RecordSubscriptionPaymentRequest(
			LocalDate paymentDate,
			@DecimalMin("0.00") BigDecimal billedAmount,
			@NotNull @DecimalMin("0.01") BigDecimal amountReceived,
			@NotNull SubscriptionPaymentMethod paymentMethod,
			@Size(max = 120) String referenceNumber,
			LocalDate billingPeriodStart,
			LocalDate billingPeriodEnd,
			Boolean renewSubscription,
			@Size(max = 1000) String remarks
	) {
	}

	public record OrganizationSubscriptionResponse(
			Long id,
			Long organizationId,
			String organizationName,
			Long planId,
			String planCode,
			String planName,
			SubscriptionStatus status,
			SubscriptionStatus effectiveStatus,
			BillingInterval billingInterval,
			BigDecimal contractedAmount,
			BigDecimal amountPaid,
			BigDecimal outstandingAmount,
			Integer planStudentLimit,
			Integer overrideStudentLimit,
			Integer effectiveStudentLimit,
			String overrideReason,
			LocalDate overrideExpiresAt,
			LocalDate startDate,
			LocalDate currentPeriodStart,
			LocalDate currentPeriodEnd,
			LocalDate nextRenewalDate,
			LocalDate expiryDate,
			boolean trial,
			boolean currentSubscription,
			LocalDate effectiveDate,
			LocalDate endedDate,
			Instant cancelledAt,
			String cancellationReason,
			String remarks,
			Instant createdAt,
			Instant updatedAt
	) {
	}

	public record OrganizationSubscriptionHistoryItem(
			Long id,
			Long organizationId,
			Long subscriptionId,
			SubscriptionEventType eventType,
			Long previousPlanId,
			String previousPlanCode,
			Long newPlanId,
			String newPlanCode,
			SubscriptionStatus previousStatus,
			SubscriptionStatus newStatus,
			BillingInterval billingInterval,
			BigDecimal contractedAmount,
			Integer studentLimit,
			LocalDate effectiveDate,
			String remarks,
			Long actorUserId,
			Instant createdAt
	) {
	}

	public record SubscriptionHistoryOverviewResponse(
			Long organizationId,
			OrganizationSubscriptionResponse currentSubscription,
			List<OrganizationSubscriptionResponse> subscriptionRecords,
			List<OrganizationSubscriptionHistoryItem> events
	) {
	}

	public record SubscriptionPaymentResponse(
			Long id,
			Long organizationId,
			String organizationName,
			Long subscriptionId,
			String invoiceNumber,
			LocalDate paymentDate,
			BigDecimal billedAmount,
			BigDecimal amountReceived,
			SubscriptionPaymentMethod paymentMethod,
			String referenceNumber,
			LocalDate billingPeriodStart,
			LocalDate billingPeriodEnd,
			SubscriptionPaymentStatus status,
			String remarks,
			Long recordedBy,
			Instant createdAt
	) {
	}

	public record SubscriptionBillingSummaryResponse(
			Long organizationId,
			String organizationName,
			OrganizationSubscriptionResponse currentSubscription,
			BigDecimal totalBilledAmount,
			BigDecimal totalPaidAmount,
			BigDecimal currentPeriodOutstandingAmount,
			List<SubscriptionPaymentResponse> payments
	) {
	}

	public record SubscriptionInvoiceReceiptResponse(
			Long paymentId,
			String invoiceNumber,
			Long organizationId,
			String organizationName,
			String organizationEmail,
			String organizationAddress,
			Long subscriptionId,
			String planCode,
			String planName,
			BillingInterval billingInterval,
			LocalDate billingPeriodStart,
			LocalDate billingPeriodEnd,
			LocalDate paymentDate,
			SubscriptionPaymentMethod paymentMethod,
			String referenceNumber,
			BigDecimal billedAmount,
			BigDecimal amountReceived,
			BigDecimal outstandingAmountAfterPayment,
			SubscriptionPaymentStatus status,
			String remarks,
			Long recordedBy,
			Instant issuedAt
	) {
	}

	// =========================================================================
	// 3. Entitlements & Usage Limits
	// =========================================================================

	public record UpdateFeatureEntitlementRequest(
			@NotNull PlatformFeature feature,
			@NotNull Boolean enabled,
			@NotBlank @Size(max = 500) String reason,
			LocalDate expiresAt
	) {
	}

	public record FeatureEntitlementItem(
			PlatformFeature feature,
			String displayName,
			boolean enabled,
			boolean includedInPlan,
			boolean overridden,
			String overrideReason,
			LocalDate overrideExpiresAt
	) {
	}

	public record OrganizationEntitlementsResponse(
			Long organizationId,
			String organizationName,
			Long planId,
			String planCode,
			String planName,
			SubscriptionStatus subscriptionStatus,
			SubscriptionStatus effectiveSubscriptionStatus,
			List<FeatureEntitlementItem> entitlements,
			Set<PlatformFeature> enabledFeatures
	) {
	}

	public record UpdateStudentLimitOverrideRequest(
			@NotNull @Positive Integer overrideStudentLimit,
			@NotBlank @Size(max = 500) String reason,
			LocalDate expiresAt
	) {
	}

	public record CategoryStorageUsageItem(
			FileResourceCategory category,
			long filesCount,
			long totalBytes
	) {
	}

	public record OrganizationStorageUsageResponse(
			Long organizationId,
			String organizationName,
			long totalFilesCount,
			long totalStorageBytes,
			List<CategoryStorageUsageItem> byCategory
	) {
	}

	public record OrganizationUsageResponse(
			Long organizationId,
			String organizationName,
			String planCode,
			String planName,
			SubscriptionStatus subscriptionStatus,
			long enrolledStudentsCount,
			long activeStudentProfilesCount,
			Integer planStudentLimit,
			Integer overrideStudentLimit,
			Integer effectiveStudentLimit,
			long remainingStudentCapacity,
			boolean limitReached,
			double utilizationPercentage,
			String overrideReason,
			LocalDate overrideExpiresAt,
			OrganizationStorageUsageResponse storageUsage
	) {
	}

	// =========================================================================
	// 4. Organization Management, Dashboard & Audit Logs
	// =========================================================================

	public record OrganizationStatusChangeRequest(
			@NotBlank @Size(max = 1000) String reason
	) {
	}

	public record OrganizationStatusHistoryItem(
			Long id,
			Long organizationId,
			OrganizationStatus previousStatus,
			OrganizationStatus newStatus,
			String reason,
			Long changedBy,
			Instant createdAt
	) {
	}

	public record OrganizationAdminMemberItem(
			Long userId,
			String firstName,
			String lastName,
			String email,
			String phoneNumber,
			MembershipStatus membershipStatus,
			Set<String> roles,
			Instant joinedAt
	) {
	}

	public record OrganizationMembershipsOverviewResponse(
			Long organizationId,
			String organizationName,
			long activeMembersCount,
			long suspendedMembersCount,
			List<OrganizationAdminMemberItem> schoolAdmins,
			List<OrganizationAdminMemberItem> members,
			long pendingAdminInvitationsCount
	) {
	}

	public record PlatformOrganizationSummaryItem(
			Long id,
			String name,
			BoardAffiliation boardAffiliation,
			String email,
			String phoneNumber,
			String city,
			String state,
			OrganizationStatus status,
			Instant registrationDate,
			OnboardingStatus onboardingStatus,
			Long planId,
			String planCode,
			String planName,
			SubscriptionStatus subscriptionStatus,
			BillingInterval billingInterval,
			LocalDate expiryDate,
			long enrolledStudentsCount,
			Integer effectiveStudentLimit,
			long remainingStudentCapacity,
			long storageBytes
	) {
	}

	public record PlatformOrganizationDetailResponse(
			Long id,
			String name,
			BoardAffiliation boardAffiliation,
			String email,
			String phoneNumber,
			String address,
			String city,
			String state,
			String postalCode,
			String timezone,
			OrganizationStatus status,
			Instant createdAt,
			Instant updatedAt,
			Long onboardingRequestId,
			OnboardingStatus onboardingStatus,
			Instant onboardingRequestedAt,
			Long onboardingReviewedBy,
			OrganizationMembershipsOverviewResponse membershipsSummary,
			OrganizationSubscriptionResponse currentSubscription,
			OrganizationEntitlementsResponse entitlements,
			OrganizationUsageResponse usage,
			List<OrganizationStatusHistoryItem> statusHistory
	) {
	}

	public record PlanDistributionItem(
			Long planId,
			String planCode,
			String planName,
			long totalOrganizations,
			long activeSubscriptions,
			long trialSubscriptions
	) {
	}

	public record UpcomingSubscriptionRenewalItem(
			Long subscriptionId,
			Long organizationId,
			String organizationName,
			Long planId,
			String planCode,
			String planName,
			SubscriptionStatus status,
			BillingInterval billingInterval,
			LocalDate nextRenewalDate,
			LocalDate expiryDate,
			long daysUntilExpiry,
			BigDecimal contractedAmount,
			BigDecimal outstandingAmount
	) {
	}

	public record PlatformDashboardResponse(
			long totalOrganizations,
			long activeOrganizations,
			long suspendedOrganizations,
			long deactivatedOrganizations,
			long pendingOnboardingRequests,
			long trialSubscriptions,
			long activeSubscriptions,
			long pastDueSubscriptions,
			long suspendedSubscriptions,
			long expiredSubscriptions,
			long cancelledSubscriptions,
			long totalPlatformUsers,
			long totalActiveEnrolledStudents,
			long totalActiveStudentProfiles,
			long totalStoredFiles,
			long totalStorageBytes,
			BigDecimal totalSubscriptionRevenue,
			BigDecimal totalOutstandingSubscriptionAmount,
			List<OrganizationAdminListItemResponse> expiringSubscriptionsWithin30Days,
			List<OrganizationAdminListItemResponse> overdueSubscriptions
	) {
	}

	public record AssignPlatformRoleRequest(
			@NotBlank @Size(max = 100) String roleCode
	) {
	}

	public record PlatformAdministratorItem(
			Long userId,
			String firstName,
			String lastName,
			String email,
			String phoneNumber,
			UserStatus userStatus,
			Set<String> platformRoles,
			Instant assignedAt
	) {
	}

	public record PlatformRoleItem(
			Long id,
			String code,
			String name,
			String description,
			boolean systemDefined,
			Set<String> permissions
	) {
	}

	public record PlatformAuditLogItem(
			Long id,
			Long actorUserId,
			String actorEmail,
			PlatformAuditAction action,
			String resourceType,
			Long resourceId,
			Long organizationId,
			String organizationName,
			String summary,
			String details,
			Instant createdAt
	) {
	}

	public record ChangePlanStatusRequest(
			@NotNull Boolean active
	) {
	}

	public record UpdateFeatureEntitlementOverrideRequest(
			@NotNull Boolean enabled,
			@NotBlank @Size(max = 500) String reason,
			LocalDate expiresAt
	) {
	}

	public record ChangeOrganizationStatusRequest(
			@NotNull OrganizationStatus status,
			@NotBlank @Size(max = 1000) String reason
	) {
	}

	public record OrganizationBillingSummaryResponse(
			Long organizationId,
			String organizationName,
			SubscriptionStatus subscriptionStatus,
			String planCode,
			String planName,
			BillingInterval billingInterval,
			BigDecimal currentPeriodContractedAmount,
			BigDecimal currentPeriodPaidAmount,
			BigDecimal currentPeriodOutstandingAmount,
			BigDecimal totalHistoricalRevenue,
			LocalDate currentPeriodStart,
			LocalDate currentPeriodEnd,
			LocalDate nextRenewalDate,
			LocalDate expiryDate,
			List<SubscriptionPaymentResponse> payments
	) {
	}

	public record OrganizationAdminListItemResponse(
			Long id,
			String name,
			BoardAffiliation boardAffiliation,
			OrganizationStatus status,
			String contactEmail,
			String contactPhone,
			String city,
			String state,
			String postalCode,
			String planCode,
			String planName,
			SubscriptionStatus subscriptionStatus,
			BillingInterval billingInterval,
			LocalDate expiryDate,
			long activeEnrolledStudents,
			Integer effectiveStudentLimit,
			boolean studentLimitReached,
			long totalStorageBytes,
			Instant createdAt
	) {
	}

	public record OrganizationAdminDetailResponse(
			Long id,
			String name,
			BoardAffiliation boardAffiliation,
			OrganizationStatus status,
			String address,
			String city,
			String state,
			String postalCode,
			String contactEmail,
			String contactPhone,
			String timezone,
			Instant createdAt,
			Instant updatedAt,
			long totalMembers,
			OrganizationSubscriptionResponse currentSubscription,
			OrganizationUsageResponse usage,
			OrganizationEntitlementsResponse entitlements,
			List<OrganizationStatusHistoryItem> statusHistory,
			List<OrganizationSubscriptionHistoryItem> subscriptionHistory
	) {
	}

	public record AssignPlatformAdminRoleRequest(
			@NotNull @Positive Long userId,
			@NotBlank @Size(max = 100) String roleCode
	) {
	}

	public record PlatformRoleBadge(
			Long roleId,
			String roleCode,
			String roleName,
			Instant assignedAt,
			Long assignedBy
	) {
	}

	public record PlatformAdminUserResponse(
			Long userId,
			String fullName,
			String email,
			String status,
			List<PlatformRoleBadge> roles
	) {
	}

	public record AuthorizationAuditLogResponse(
			Long id,
			Long actorUserId,
			Long targetUserId,
			Long organizationId,
			String action,
			String details,
			Instant createdAt
	) {
	}
}

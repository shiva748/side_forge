package com.side.forge.platform.saas.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.platform.saas.dto.SaaSDtos.*;
import com.side.forge.platform.saas.enums.*;
import com.side.forge.platform.saas.service.*;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Platform SaaS Administration", description = "Platform-level administration for organizations, plans, subscriptions, manual billing, feature entitlements, usage limits, and audit logs")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/platform")
@RequiredArgsConstructor
public class PlatformSaaSController {

	private final PlatformAdministrationService administrationService;
	private final SubscriptionPlanService planService;
	private final PlatformSubscriptionService subscriptionService;
	private final SubscriptionEntitlementService entitlementService;
	private final PlatformAuditService auditService;

	@GetMapping("/dashboard")
	public ResponseEntity<ApiResponse<PlatformDashboardResponse>> getPlatformDashboard() {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Platform dashboard metrics retrieved successfully",
				administrationService.getPlatformDashboard()));
	}

	@GetMapping("/organizations")
	public ResponseEntity<ApiResponse<PagedResponse<OrganizationAdminListItemResponse>>> listOrganizations(
			@RequestParam(required = false) OrganizationStatus status,
			@RequestParam(required = false) SubscriptionStatus subscriptionStatus,
			@RequestParam(required = false) String planCode,
			@RequestParam(required = false) String search,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organizations retrieved successfully",
				administrationService.listOrganizations(status, subscriptionStatus, planCode, search, page, size)));
	}

	@GetMapping("/organizations/{organizationId}")
	public ResponseEntity<ApiResponse<OrganizationAdminDetailResponse>> getOrganizationDetails(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization details retrieved successfully",
				administrationService.getOrganizationDetails(organizationId)));
	}

	@PatchMapping("/organizations/{organizationId}/status")
	public ResponseEntity<ApiResponse<OrganizationAdminDetailResponse>> changeOrganizationStatus(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody ChangeOrganizationStatusRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization status updated successfully",
				administrationService.changeOrganizationStatus(organizationId, request)));
	}

	@GetMapping("/admins")
	public ResponseEntity<ApiResponse<List<PlatformAdminUserResponse>>> listPlatformAdmins() {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Platform administrators retrieved successfully",
				administrationService.listPlatformAdmins()));
	}

	@PostMapping("/admins/roles")
	public ResponseEntity<ApiResponse<PlatformAdminUserResponse>> assignPlatformAdminRole(
			@Valid @RequestBody AssignPlatformAdminRoleRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>(
				true,
				"Platform administrator role assigned successfully",
				administrationService.assignPlatformAdminRole(request)));
	}

	@DeleteMapping("/admins/{userId}/roles/{roleCode}")
	public ResponseEntity<ApiResponse<PlatformAdminUserResponse>> revokePlatformAdminRole(
			@PathVariable @Positive Long userId,
			@PathVariable @NotBlank String roleCode) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Platform administrator role revoked successfully",
				administrationService.revokePlatformAdminRole(userId, roleCode)));
	}

	@GetMapping("/plans")
	public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> listPlans(
			@RequestParam(required = false) Boolean activeOnly) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Subscription plans retrieved successfully",
				planService.listPlans(activeOnly)));
	}

	@GetMapping("/plans/{planId}")
	public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> getPlan(
			@PathVariable @Positive Long planId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Subscription plan retrieved successfully",
				planService.getPlan(planId)));
	}

	@PostMapping("/plans")
	public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> createPlan(
			@Valid @RequestBody CreateSubscriptionPlanRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>(
				true,
				"Subscription plan created successfully",
				planService.createPlan(request)));
	}

	@PutMapping("/plans/{planId}")
	public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> updatePlan(
			@PathVariable @Positive Long planId,
			@Valid @RequestBody UpdateSubscriptionPlanRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Subscription plan updated successfully",
				planService.updatePlan(planId, request)));
	}

	@PatchMapping("/plans/{planId}/status")
	public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> changePlanStatus(
			@PathVariable @Positive Long planId,
			@Valid @RequestBody ChangePlanStatusRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Subscription plan status updated successfully",
				planService.changePlanStatus(planId, request)));
	}

	@PostMapping("/organizations/{organizationId}/subscriptions")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> assignSubscription(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody AssignSubscriptionRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>(
				true,
				"Organization subscription assigned successfully",
				subscriptionService.assignSubscription(organizationId, request)));
	}

	@GetMapping("/organizations/{organizationId}/subscriptions/current")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> getCurrentSubscription(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Current organization subscription retrieved successfully",
				subscriptionService.getCurrentSubscription(organizationId)));
	}

	@GetMapping("/organizations/{organizationId}/subscriptions/records")
	public ResponseEntity<ApiResponse<List<OrganizationSubscriptionResponse>>> getAllSubscriptionRecords(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription records retrieved successfully",
				subscriptionService.getAllOrganizationSubscriptionRecords(organizationId)));
	}

	@GetMapping("/organizations/{organizationId}/subscriptions/history")
	public ResponseEntity<ApiResponse<List<OrganizationSubscriptionHistoryItem>>> getSubscriptionHistory(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription history retrieved successfully",
				subscriptionService.getSubscriptionHistory(organizationId)));
	}

	@PostMapping("/organizations/{organizationId}/subscriptions/change-plan")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> changeSubscriptionPlan(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody ChangeSubscriptionPlanRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription plan changed successfully",
				subscriptionService.changeSubscriptionPlan(organizationId, request)));
	}

	@PostMapping("/organizations/{organizationId}/subscriptions/renew")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> renewSubscription(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody(required = false) RenewSubscriptionRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription renewed successfully",
				subscriptionService.renewSubscription(organizationId, request)));
	}

	@PostMapping("/organizations/{organizationId}/subscriptions/cancel")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> cancelSubscription(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CancelSubscriptionRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription cancelled successfully",
				subscriptionService.cancelSubscription(organizationId, request)));
	}

	@PatchMapping("/organizations/{organizationId}/subscriptions/status")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> updateSubscriptionStatus(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody UpdateSubscriptionStatusRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription status updated successfully",
				subscriptionService.updateSubscriptionStatus(organizationId, request)));
	}

	@PostMapping("/organizations/{organizationId}/billing/payments")
	public ResponseEntity<ApiResponse<SubscriptionPaymentResponse>> recordManualPayment(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody RecordSubscriptionPaymentRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>(
				true,
				"Subscription payment recorded successfully",
				subscriptionService.recordManualPayment(organizationId, request)));
	}

	@GetMapping("/organizations/{organizationId}/billing")
	public ResponseEntity<ApiResponse<OrganizationBillingSummaryResponse>> getBillingSummary(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization billing summary retrieved successfully",
				subscriptionService.getBillingSummary(organizationId)));
	}

	@GetMapping("/organizations/{organizationId}/billing/payments")
	public ResponseEntity<ApiResponse<List<SubscriptionPaymentResponse>>> getOrganizationPayments(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription payments retrieved successfully",
				subscriptionService.getOrganizationPayments(organizationId)));
	}

	@GetMapping("/organizations/{organizationId}/billing/payments/{paymentId}")
	public ResponseEntity<ApiResponse<SubscriptionPaymentResponse>> getPaymentReceipt(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long paymentId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Subscription payment receipt retrieved successfully",
				subscriptionService.getPaymentReceipt(organizationId, paymentId)));
	}

	@GetMapping("/organizations/{organizationId}/billing/payments/{paymentId}/receipt/export")
	public ResponseEntity<byte[]> exportPaymentReceipt(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long paymentId,
			@RequestParam(defaultValue = "PDF") ExportFormat format) {
		ExportDocument doc = subscriptionService.downloadPaymentReceipt(organizationId, paymentId, format);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.filename() + "\"")
				.contentType(MediaType.parseMediaType(doc.contentType()))
				.body(doc.content());
	}

	@GetMapping("/billing/payments")
	public ResponseEntity<ApiResponse<PagedResponse<SubscriptionPaymentResponse>>> getAllPayments(
			@RequestParam(required = false) Long organizationId,
			@RequestParam(required = false) SubscriptionPaymentStatus status,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Platform subscription payments retrieved successfully",
				subscriptionService.getAllPayments(organizationId, status, page, size)));
	}

	@GetMapping("/organizations/{organizationId}/entitlements")
	public ResponseEntity<ApiResponse<OrganizationEntitlementsResponse>> getOrganizationEntitlements(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization feature entitlements retrieved successfully",
				entitlementService.getOrganizationEntitlements(organizationId)));
	}

	@PutMapping("/organizations/{organizationId}/entitlements/{feature}")
	public ResponseEntity<ApiResponse<OrganizationEntitlementsResponse>> setFeatureOverride(
			@PathVariable @Positive Long organizationId,
			@PathVariable PlatformFeature feature,
			@Valid @RequestBody UpdateFeatureEntitlementOverrideRequest request) {
		UpdateFeatureEntitlementRequest fullReq = new UpdateFeatureEntitlementRequest(
				feature, request.enabled(), request.reason(), request.expiresAt());
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization feature override updated successfully",
				entitlementService.setOrganizationFeatureEntitlement(organizationId, fullReq)));
	}

	@DeleteMapping("/organizations/{organizationId}/entitlements/{feature}")
	public ResponseEntity<ApiResponse<OrganizationEntitlementsResponse>> removeFeatureOverride(
			@PathVariable @Positive Long organizationId,
			@PathVariable PlatformFeature feature) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization feature override removed successfully",
				entitlementService.removeOrganizationFeatureEntitlement(organizationId, feature)));
	}

	@GetMapping("/organizations/{organizationId}/usage")
	public ResponseEntity<ApiResponse<OrganizationUsageResponse>> getOrganizationUsage(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization student and storage usage retrieved successfully",
				entitlementService.getOrganizationUsage(organizationId)));
	}

	@GetMapping("/organizations/{organizationId}/storage-usage")
	public ResponseEntity<ApiResponse<OrganizationStorageUsageResponse>> getOrganizationStorageUsage(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization storage usage retrieved successfully",
				entitlementService.getOrganizationStorageUsage(organizationId)));
	}

	@PutMapping("/organizations/{organizationId}/student-limit-override")
	public ResponseEntity<ApiResponse<OrganizationUsageResponse>> setStudentLimitOverride(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody UpdateStudentLimitOverrideRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization student limit override updated successfully",
				entitlementService.setStudentLimitOverride(organizationId, request)));
	}

	@DeleteMapping("/organizations/{organizationId}/student-limit-override")
	public ResponseEntity<ApiResponse<OrganizationUsageResponse>> clearStudentLimitOverride(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) String reason) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization student limit override cleared successfully",
				entitlementService.clearStudentLimitOverride(organizationId, reason)));
	}

	@GetMapping("/audit-logs")
	public ResponseEntity<ApiResponse<PagedResponse<PlatformAuditLogItem>>> getPlatformAuditLogs(
			@RequestParam(required = false) PlatformAuditAction action,
			@RequestParam(required = false) Long targetOrganizationId,
			@RequestParam(required = false) Long actorUserId,
			@RequestParam(required = false) String resourceType,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Platform audit logs retrieved successfully",
				auditService.getAuditLogs(targetOrganizationId, actorUserId, action, resourceType, page, size)));
	}

	@GetMapping("/authorization-audit-logs")
	public ResponseEntity<ApiResponse<PagedResponse<AuthorizationAuditLogResponse>>> getAuthorizationAuditLogs(
			@RequestParam(required = false) Long organizationId,
			@RequestParam(required = false) Long actorUserId,
			@RequestParam(required = false) String action,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Authorization audit logs retrieved successfully",
				auditService.getAuthorizationAuditLogs(organizationId, actorUserId, action, page, size)));
	}
}

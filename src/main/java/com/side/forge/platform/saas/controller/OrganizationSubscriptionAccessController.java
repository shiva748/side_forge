package com.side.forge.platform.saas.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.platform.saas.dto.SaaSDtos.*;
import com.side.forge.platform.saas.entity.SubscriptionPayment;
import com.side.forge.platform.saas.repository.OrganizationSubscriptionRepository;
import com.side.forge.platform.saas.repository.SubscriptionPaymentRepository;
import com.side.forge.platform.saas.service.PlatformSubscriptionService;
import com.side.forge.platform.saas.service.SubscriptionEntitlementService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

/**
 * Organization-scoped read-only endpoints allowing school administrators
 * to view their active SaaS subscription, module entitlements, active student
 * and storage usage, billing summary, and payment receipts.
 */
@RestController
@Validated
@Tag(name = "Organization Subscription & Usage", description = "School-level read access to current subscription, entitlements, student/storage usage, and billing receipts")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/subscription")
@RequiredArgsConstructor
public class OrganizationSubscriptionAccessController {

	private final AcademicTenantAccessValidator tenantValidator;
	private final OrganizationSubscriptionRepository subscriptionRepository;
	private final SubscriptionPaymentRepository paymentRepository;
	private final PlatformSubscriptionService subscriptionService;
	private final SubscriptionEntitlementService entitlementService;

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> getCurrentSubscription(
			@PathVariable @Positive Long organizationId) {
		Organization org = tenantValidator.requireOrganizationAllowingSuspended(organizationId);
		OrganizationSubscriptionResponse sub = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(organizationId)
				.map(s -> subscriptionService.toResponse(s, org))
				.orElse(null);
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization subscription retrieved successfully", sub));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@GetMapping("/entitlements")
	public ResponseEntity<ApiResponse<OrganizationEntitlementsResponse>> getEntitlements(
			@PathVariable @Positive Long organizationId) {
		tenantValidator.requireOrganizationAllowingSuspended(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization feature entitlements retrieved successfully",
				entitlementService.getOrganizationEntitlements(organizationId)));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@GetMapping("/usage")
	public ResponseEntity<ApiResponse<OrganizationUsageResponse>> getUsage(
			@PathVariable @Positive Long organizationId) {
		tenantValidator.requireOrganizationAllowingSuspended(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization student and storage usage retrieved successfully",
				entitlementService.getOrganizationUsage(organizationId)));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@GetMapping("/billing")
	public ResponseEntity<ApiResponse<OrganizationBillingSummaryResponse>> getBillingSummary(
			@PathVariable @Positive Long organizationId) {
		Organization org = tenantValidator.requireOrganizationAllowingSuspended(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization billing summary retrieved successfully",
				subscriptionService.buildBillingSummaryForOrganization(org)));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PostMapping("/renew")
	public ResponseEntity<ApiResponse<OrganizationSubscriptionResponse>> renewSubscription(
			@PathVariable @Positive Long organizationId,
			@jakarta.validation.Valid @RequestBody(required = false) RenewSubscriptionRequest request) {
		tenantValidator.requireOrganizationAllowingSuspended(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization subscription renewed successfully",
				subscriptionService.renewSubscriptionFromSchoolBillingPortal(organizationId, request)));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@GetMapping("/payments/{paymentId}/receipt/export")
	public ResponseEntity<byte[]> exportPaymentReceipt(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long paymentId,
			@RequestParam(defaultValue = "PDF") ExportFormat format) {
		Organization org = tenantValidator.requireOrganizationAllowingSuspended(organizationId);
		SubscriptionPayment payment = paymentRepository.findByIdAndOrganizationId(paymentId, organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Subscription payment not found: " + paymentId));
		ExportDocument doc = subscriptionService.generateReceiptExportDocument(org, payment, format);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.filename() + "\"")
				.contentType(MediaType.parseMediaType(doc.contentType()))
				.body(doc.content());
	}
}

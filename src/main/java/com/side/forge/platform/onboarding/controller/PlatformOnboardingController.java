package com.side.forge.platform.onboarding.controller;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.onboarding.entity.OnboardingStatus;
import com.side.forge.organization.onboarding.service.OrganizationOnboardingService;
import com.side.forge.platform.saas.dto.SaaSDtos.ApproveOnboardingSubscriptionRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@Tag(name = "Platform Onboarding", description = "Review and manage organization onboarding applications")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/platform/onboarding/organizations")
@RequiredArgsConstructor
public class PlatformOnboardingController {

    private final OrganizationOnboardingService onboardingService;

    @RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_VIEW)
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<OnboardingRequest>>> listRequests(
            @RequestParam(required = false) OnboardingStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Onboarding requests retrieved successfully",
                onboardingService.listOnboardingRequests(status, search, page, size)));
    }

    @RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_VIEW)
    @GetMapping("/{requestId}")
    public ResponseEntity<ApiResponse<OnboardingRequest>> getRequest(
            @PathVariable @Positive Long requestId) {
        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Onboarding request retrieved successfully",
                onboardingService.getOnboardingRequest(requestId)));
    }

    @RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
    @PostMapping("/{requestId}/approve")
    public ResponseEntity<Organization> approve(
            @PathVariable @Positive Long requestId,
            @Valid @RequestBody(required = false) ApproveOnboardingSubscriptionRequest subscriptionRequest,
            Authentication authentication) {
        Long reviewedBy = AuthenticationUtils.getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(onboardingService.approveOnboardingRequest(requestId, reviewedBy, subscriptionRequest));
    }

    @RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
    @PostMapping("/{requestId}/reject")
    public ResponseEntity<?> reject(
            @PathVariable @Positive Long requestId,
            @RequestParam @NotBlank @Size(max = 1000) String rejectionReason,
            Authentication authentication) {
        Long reviewedBy = AuthenticationUtils.getAuthenticatedUserId(authentication);
        onboardingService.rejectOnboardingRequest(requestId, reviewedBy, rejectionReason);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new ApiResponse<>(true, "Onboarding request rejected successfully."));
    }
}

package com.side.forge.platform.onboarding.controller;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.onboarding.service.OrganizationOnboardingService;
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

    @RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
    @PostMapping("/{requestId}/approve")
    public ResponseEntity<Organization> approve(
            @PathVariable @Positive Long requestId,
            Authentication authentication) {
        Long reviewedBy = AuthenticationUtils.getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(onboardingService.approveOnboardingRequest(requestId, reviewedBy));
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

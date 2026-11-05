package com.side.forge.organization.onboarding.controller;

import com.side.forge.common.utils.AuthenticationUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.side.forge.organization.onboarding.dto.OnboardingRequestDto;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.onboarding.service.OrganizationOnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public organization application submission. The application lifecycle and
 * persistence belong to the organization onboarding domain; platform review
 * is exposed separately by PlatformOnboardingController.
 */
@RestController
@Validated
@Tag(name = "Organization Onboarding", description = "Submit an organization onboarding application")
@RequestMapping("/api/organizations/onboarding")
@RequiredArgsConstructor
public class OrganizationOnboardingController {

    private final OrganizationOnboardingService onboardingService;

    @PostMapping
    public ResponseEntity<OnboardingRequest> submit(
            @Valid @RequestBody OnboardingRequestDto request,
            Authentication authentication) {
        Long requestedBy = AuthenticationUtils.getAuthenticatedUserId(authentication);
        OnboardingRequest created = onboardingService.submitOnboardingRequest(request, requestedBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}

package com.side.forge.organization.onboarding.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.OrganizationAdminProvisioningService;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.onboarding.dto.OnboardingRequestDto;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.onboarding.entity.OnboardingStatus;
import com.side.forge.organization.onboarding.mapper.OnboardingMapper;
import com.side.forge.organization.onboarding.repository.OnboardingRequestRepository;
import com.side.forge.organization.repository.OrganizationRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrganizationOnboardingService {

	private final OnboardingRequestRepository onboardingRequestRepository;
	private final OrganizationRepository organizationRepository;
	private final OnboardingMapper onboardingMapper;
	private final OrganizationAdminProvisioningService adminProvisioningService;

	@Transactional
	public OnboardingRequest submitOnboardingRequest(OnboardingRequestDto dto, Long requestedBy) {
		OnboardingRequest request = onboardingMapper.toEntity(dto);
		request.setRequestedBy(requestedBy);
		request.setStatus(OnboardingStatus.PENDING);
		return onboardingRequestRepository.save(request);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public Organization approveOnboardingRequest(Long requestId, Long reviewedBy) {
		OnboardingRequest request = getRequest(requestId);
		validateRequestStatus(request);

		Organization organization = onboardingMapper.toOrganization(request);
		organization.setStatus(OrganizationStatus.ACTIVE);
		organization = organizationRepository.save(organization);

		// Authenticated applicants become the initial school administrator.
		// Anonymous onboarding requests need a later invitation/provisioning flow.
		if (request.getRequestedBy() != null) {
			adminProvisioningService.provisionInitialSchoolAdmin(request.getRequestedBy(), organization.getId());
		}

		request.setStatus(OnboardingStatus.APPROVED);
		request.setReviewedBy(reviewedBy);
		return organization;
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public void rejectOnboardingRequest(Long requestId, Long reviewedBy, String rejectionReason) {
		OnboardingRequest request = getRequest(requestId);
		validateRequestStatus(request);
		request.setStatus(OnboardingStatus.REJECTED);
		request.setReviewedBy(reviewedBy);
		request.setRejectionReason(rejectionReason);
	}

	private OnboardingRequest getRequest(Long requestId) {
		return onboardingRequestRepository.findById(requestId)
				.orElseThrow(() -> new EntityNotFoundException("Onboarding request not found"));
	}

	private void validateRequestStatus(OnboardingRequest request) {
		if (request.getStatus() != OnboardingStatus.PENDING && request.getStatus() != OnboardingStatus.UNDER_REVIEW) {
			throw new IllegalStateException("Onboarding request has already been processed");
		}
	}
}

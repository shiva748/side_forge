package com.side.forge.organization.onboarding.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.OrganizationAdminProvisioningService;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.invitation.service.InvitationService;
import com.side.forge.organization.onboarding.dto.OnboardingRequestDto;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.onboarding.entity.OnboardingStatus;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.onboarding.mapper.OnboardingMapper;
import com.side.forge.organization.onboarding.repository.OnboardingRequestRepository;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.dto.SaaSDtos.ApproveOnboardingSubscriptionRequest;
import com.side.forge.platform.saas.entity.OrganizationStatusHistory;
import com.side.forge.platform.saas.enums.PlatformAuditAction;
import com.side.forge.platform.saas.repository.OrganizationStatusHistoryRepository;
import com.side.forge.platform.saas.service.PlatformAuditService;
import com.side.forge.platform.saas.service.PlatformSubscriptionService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrganizationOnboardingService {

	private final OnboardingRequestRepository onboardingRequestRepository;
	private final OrganizationRepository organizationRepository;
	private final OnboardingMapper onboardingMapper;
	private final OrganizationAdminProvisioningService adminProvisioningService;
	private final InvitationService invitationService;
	private final PlatformSubscriptionService platformSubscriptionService;
	private final OrganizationStatusHistoryRepository statusHistoryRepository;
	private final PlatformAuditService platformAuditService;

	@Transactional
	public OnboardingRequest submitOnboardingRequest(OnboardingRequestDto dto, Long requestedBy) {
		OnboardingRequest request = onboardingMapper.toEntity(dto);
		request.setRequestedBy(requestedBy);
		request.setStatus(OnboardingStatus.PENDING);
		return onboardingRequestRepository.save(request);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<OnboardingRequest> listOnboardingRequests(
			OnboardingStatus status, String search, int page, int size) {
		int safePage = Math.max(0, page);
		int safeSize = Math.min(100, Math.max(1, size));

		List<OnboardingRequest> allRequests = new ArrayList<>(onboardingRequestRepository.findAll());
		allRequests.sort(Comparator.comparing(OnboardingRequest::getId).reversed());

		String normalizedSearch = search != null && !search.isBlank()
				? search.trim().toLowerCase(Locale.ROOT)
				: null;

		List<OnboardingRequest> filtered = new ArrayList<>();
		for (OnboardingRequest req : allRequests) {
			if (status != null && req.getStatus() != status) {
				continue;
			}
			if (normalizedSearch != null && !matchesSearch(req, normalizedSearch)) {
				continue;
			}
			filtered.add(req);
		}

		long totalElements = filtered.size();
		int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
		int fromIndex = Math.min(safePage * safeSize, filtered.size());
		int toIndex = Math.min(fromIndex + safeSize, filtered.size());
		List<OnboardingRequest> pageContent = filtered.subList(fromIndex, toIndex);

		return new PagedResponse<>(
				pageContent,
				safePage,
				safeSize,
				totalElements,
				totalPages,
				safePage == 0,
				totalPages == 0 || safePage >= totalPages - 1
		);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_VIEW)
	@Transactional(readOnly = true)
	public OnboardingRequest getOnboardingRequest(Long requestId) {
		return getRequest(requestId);
	}

	private boolean matchesSearch(OnboardingRequest req, String query) {
		if (req.getId() != null) {
			String idStr = String.valueOf(req.getId());
			String refStr = ("#onb-" + idStr);
			if (idStr.contains(query) || refStr.contains(query)) {
				return true;
			}
		}
		return containsIgnoreCase(req.getSchoolName(), query)
				|| containsIgnoreCase(req.getContactPersonName(), query)
				|| containsIgnoreCase(req.getContactEmail(), query)
				|| containsIgnoreCase(req.getSchoolEmail(), query)
				|| containsIgnoreCase(req.getMobileNumber(), query)
				|| containsIgnoreCase(req.getSchoolPhone(), query)
				|| containsIgnoreCase(req.getCity(), query)
				|| containsIgnoreCase(req.getState(), query);
	}

	private boolean containsIgnoreCase(String value, String query) {
		return value != null && value.toLowerCase(Locale.ROOT).contains(query);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public Organization approveOnboardingRequest(Long requestId, Long reviewedBy) {
		return approveOnboardingRequest(requestId, reviewedBy, null);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public Organization approveOnboardingRequest(
			Long requestId, Long reviewedBy, ApproveOnboardingSubscriptionRequest subscriptionRequest) {
		OnboardingRequest request = getRequest(requestId);
		validateRequestStatus(request);

		Organization organization = onboardingMapper.toOrganization(request);
		organization.setStatus(OrganizationStatus.ACTIVE);
		organization = organizationRepository.save(organization);

		OrganizationStatusHistory initialStatus = new OrganizationStatusHistory();
		initialStatus.setOrganizationId(organization.getId());
		initialStatus.setPreviousStatus(null);
		initialStatus.setNewStatus(OrganizationStatus.ACTIVE);
		initialStatus.setReason("Organization created and activated upon onboarding approval");
		initialStatus.setChangedBy(reviewedBy);
		statusHistoryRepository.save(initialStatus);

		// Authenticated applicants become the initial school administrator.
		// Anonymous onboarding requests automatically receive an initial SCHOOL_ADMIN invitation.
		if (request.getRequestedBy() != null) {
			adminProvisioningService.provisionInitialSchoolAdmin(request.getRequestedBy(), organization.getId());
		} else if (request.getContactEmail() != null && !request.getContactEmail().isBlank()) {
			invitationService.createInitialSchoolAdminInvitationOnApproval(organization, request, reviewedBy);
		}

		platformSubscriptionService.provisionDefaultSubscriptionOnOnboardingApproval(
				organization, reviewedBy, subscriptionRequest);

		request.setStatus(OnboardingStatus.APPROVED);
		request.setReviewedBy(reviewedBy);

		platformAuditService.recordAction(
				reviewedBy,
				PlatformAuditAction.ONBOARDING_APPROVED,
				"ONBOARDING_REQUEST",
				request.getId(),
				organization.getId(),
				"Approved onboarding request for " + organization.getName(),
				"requestedBy=" + request.getRequestedBy() + ", orgId=" + organization.getId());

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

		platformAuditService.recordAction(
				reviewedBy,
				PlatformAuditAction.ONBOARDING_REJECTED,
				"ONBOARDING_REQUEST",
				request.getId(),
				null,
				"Rejected onboarding request for " + request.getSchoolName(),
				"reason=" + rejectionReason);
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

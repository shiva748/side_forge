package com.side.forge.organization.academic.common;

import java.time.DateTimeException;
import java.time.ZoneId;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.exception.SubscriptionAccessException;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Enforces tenant context consistency and resolves tenant-scoped Organization
 * records for Academic Foundation operations.
 */
@Component
@RequiredArgsConstructor
public class AcademicTenantAccessValidator {

	private static final ZoneId DEFAULT_ZONE_ID = ZoneId.of("Asia/Kolkata");

	private final CurrentUserContext currentUser;
	private final OrganizationRepository organizationRepository;

	public void verifyOrganizationContext(Long organizationId) {
		if (organizationId == null || organizationId <= 0) {
			throw new IllegalArgumentException("Organization ID must be a positive number");
		}
		if (currentUser.isPlatformContext() || currentUser.getOrganizationId() == null
				|| !currentUser.getOrganizationId().equals(organizationId)) {
			throw new AccessDeniedException("Organization authorization context does not match requested organization");
		}
	}

	public Organization requireOrganization(Long organizationId) {
		verifyOrganizationContext(organizationId);
		Organization org = organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found"));
		if (org.getStatus() != OrganizationStatus.ACTIVE) {
			throw new SubscriptionAccessException("Organization is not active: current status is " + org.getStatus());
		}
		return org;
	}

	public Organization requireOrganizationAllowingSuspended(Long organizationId) {
		verifyOrganizationContext(organizationId);
		Organization org = organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found"));
		if (org.getStatus() != OrganizationStatus.ACTIVE && org.getStatus() != OrganizationStatus.SUSPENDED) {
			throw new SubscriptionAccessException("Organization is not accessible: current status is " + org.getStatus());
		}
		return org;
	}

	public Organization requireOrganizationForUpdate(Long organizationId) {
		verifyOrganizationContext(organizationId);
		Organization org = organizationRepository.findByIdForUpdate(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found"));
		if (org.getStatus() != OrganizationStatus.ACTIVE) {
			throw new SubscriptionAccessException("Organization is not active: current status is " + org.getStatus());
		}
		return org;
	}

	public ZoneId resolveZoneId(Organization organization) {
		String timezone = organization.getTimezone();
		if (timezone == null || timezone.isBlank()) {
			return DEFAULT_ZONE_ID;
		}
		try {
			return ZoneId.of(timezone.trim());
		} catch (DateTimeException ex) {
			return DEFAULT_ZONE_ID;
		}
	}

	public String normalizeRequiredText(String value, String fieldLabel) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(fieldLabel + " is required");
		}
		return value.trim();
	}

	public String normalizeCode(String code, String fieldLabel) {
		if (code == null || code.isBlank()) {
			throw new IllegalArgumentException(fieldLabel + " is required");
		}
		return code.trim().toUpperCase( java.util.Locale.ROOT);
	}

	public String normalizeOptionalText(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	public int resolveDisplayOrder(Integer displayOrder, int fallbackOrder) {
		if (displayOrder == null) {
			return fallbackOrder;
		}
		if (displayOrder <= 0) {
			throw new IllegalArgumentException("Display order must be a positive number");
		}
		return displayOrder;
	}

	public void validateCapacity(Integer capacity) {
		if (capacity != null && capacity <= 0) {
			throw new IllegalArgumentException("Capacity must be a positive number");
		}
	}
}

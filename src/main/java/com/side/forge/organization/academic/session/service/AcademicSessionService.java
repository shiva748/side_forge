package com.side.forge.organization.academic.session.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.session.dto.AcademicSessionResponse;
import com.side.forge.organization.academic.session.dto.CreateAcademicSessionRequest;
import com.side.forge.organization.academic.session.dto.UpdateAcademicSessionRequest;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.mapper.AcademicSessionMapper;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.entity.Organization;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AcademicSessionService {

	private final AcademicSessionRepository academicSessionRepository;
	private final AcademicSessionMapper academicSessionMapper;
	private final AcademicTenantAccessValidator tenantValidator;

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@Transactional
	public AcademicSessionResponse createSession(Long organizationId, CreateAcademicSessionRequest request) {
		tenantValidator.requireOrganization(organizationId);

		String normalizedName = normalizeName(request.name());
		if (academicSessionRepository.existsByOrganizationIdAndNameIgnoreCase(organizationId, normalizedName)) {
			throw new IllegalStateException("Academic session with this name already exists in the organization");
		}

		AcademicSession session = academicSessionMapper.toEntity(request);
		session.setOrganizationId(organizationId);
		session.setName(normalizedName);
		session.setStartDate(null);
		session.setEndDate(null);
		session.setStatus(AcademicSessionStatus.PLANNED);
		session.setActiveOrganizationId(null);

		return academicSessionMapper.toResponse(academicSessionRepository.save(session));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_VIEW)
	@Transactional(readOnly = true)
	public List<AcademicSessionResponse> getSessions(Long organizationId, AcademicSessionStatus status) {
		tenantValidator.requireOrganization(organizationId);

		List<AcademicSession> sessions = status == null
				? academicSessionRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(organizationId)
				: academicSessionRepository.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(
						organizationId, status);

		return sessions.stream().map(academicSessionMapper::toResponse).toList();
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_VIEW)
	@Transactional(readOnly = true)
	public AcademicSessionResponse getSession(Long organizationId, Long sessionId) {
		tenantValidator.requireOrganization(organizationId);
		return academicSessionMapper.toResponse(requireSession(organizationId, sessionId));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@Transactional
	public AcademicSessionResponse updateSession(Long organizationId, Long sessionId,
			UpdateAcademicSessionRequest request) {
		tenantValidator.requireOrganization(organizationId);
		AcademicSession session = requireSession(organizationId, sessionId);

		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Completed academic session cannot be modified.");
		}

		String normalizedName = normalizeName(request.name());
		if (academicSessionRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(
				organizationId, normalizedName, sessionId)) {
			throw new IllegalStateException("Academic session with this name already exists in the organization");
		}

		session.setName(normalizedName);
		return academicSessionMapper.toResponse(academicSessionRepository.save(session));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@Transactional
	public AcademicSessionResponse startSession(Long organizationId, Long sessionId) {
		// Acquire pessimistic write lock on the Organization row so two concurrent
		// start requests for the same organization are serialized.
		Organization organization = tenantValidator.requireOrganizationForUpdate(organizationId);
		AcademicSession session = requireSession(organizationId, sessionId);

		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Completed academic session cannot be reopened or started.");
		}
		if (session.getStatus() == AcademicSessionStatus.ACTIVE) {
			throw new IllegalStateException("Academic session is already active.");
		}
		if (academicSessionRepository.existsByOrganizationIdAndStatus(organizationId, AcademicSessionStatus.ACTIVE)) {
			throw new IllegalStateException("Complete the current active session before starting a new one.");
		}

		LocalDate today = LocalDate.now(tenantValidator.resolveZoneId(organization));
		session.setStartDate(today);
		session.setEndDate(null);
		session.setStatus(AcademicSessionStatus.ACTIVE);
		session.setActiveOrganizationId(organizationId);

		return academicSessionMapper.toResponse(academicSessionRepository.saveAndFlush(session));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@Transactional
	public AcademicSessionResponse completeSession(Long organizationId, Long sessionId) {
		Organization organization = tenantValidator.requireOrganizationForUpdate(organizationId);
		AcademicSession session = requireSession(organizationId, sessionId);

		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Academic session is already completed.");
		}
		if (session.getStatus() != AcademicSessionStatus.ACTIVE) {
			throw new IllegalStateException("Only an active academic session can be completed.");
		}

		LocalDate today = LocalDate.now(tenantValidator.resolveZoneId(organization));
		session.setEndDate(today);
		session.setStatus(AcademicSessionStatus.COMPLETED);
		session.setActiveOrganizationId(null);

		return academicSessionMapper.toResponse(academicSessionRepository.saveAndFlush(session));
	}

	public AcademicSession requireSession(Long organizationId, Long sessionId) {
		return academicSessionRepository.findByIdAndOrganizationId(sessionId, organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Academic session not found"));
	}

	private String normalizeName(String name) {
		if (name == null || name.isBlank()) {
			throw new IllegalArgumentException("Academic session name is required");
		}
		return name.trim();
	}
}

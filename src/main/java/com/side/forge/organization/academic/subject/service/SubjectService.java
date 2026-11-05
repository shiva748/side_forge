package com.side.forge.organization.academic.subject.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.subject.dto.CreateSubjectRequest;
import com.side.forge.organization.academic.subject.dto.SubjectResponse;
import com.side.forge.organization.academic.subject.dto.UpdateSubjectRequest;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.mapper.SubjectMapper;
import com.side.forge.organization.academic.subject.repository.SubjectRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubjectService {

	private final SubjectRepository subjectRepository;
	private final SubjectMapper subjectMapper;
	private final AcademicTenantAccessValidator tenantValidator;

	@RequirePermission(PermissionCode.SUBJECT_MANAGE)
	@Transactional
	public SubjectResponse createSubject(Long organizationId, CreateSubjectRequest request) {
		tenantValidator.requireOrganization(organizationId);

		String normalizedName = tenantValidator.normalizeRequiredText(request.name(), "Subject name");
		String normalizedCode = tenantValidator.normalizeCode(request.code(), "Subject code");

		if (subjectRepository.existsByOrganizationIdAndCodeIgnoreCase(organizationId, normalizedCode)) {
			throw new IllegalStateException("Subject with this code already exists in the organization");
		}

		Subject subject = subjectMapper.toEntity(request);
		subject.setOrganizationId(organizationId);
		subject.setName(normalizedName);
		subject.setCode(normalizedCode);
		subject.setDescription(tenantValidator.normalizeOptionalText(request.description()));
		subject.setActive(true);

		return subjectMapper.toResponse(subjectRepository.save(subject));
	}

	@RequirePermission(PermissionCode.SUBJECT_VIEW)
	@Transactional(readOnly = true)
	public List<SubjectResponse> getSubjects(Long organizationId, Boolean active) {
		tenantValidator.requireOrganization(organizationId);

		List<Subject> subjects = active == null
				? subjectRepository.findAllByOrganizationIdOrderByNameAsc(organizationId)
				: subjectRepository.findAllByOrganizationIdAndActiveOrderByNameAsc(organizationId, active);

		return subjects.stream().map(subjectMapper::toResponse).toList();
	}

	@RequirePermission(PermissionCode.SUBJECT_VIEW)
	@Transactional(readOnly = true)
	public SubjectResponse getSubjectById(Long organizationId, Long subjectId) {
		tenantValidator.requireOrganization(organizationId);
		return subjectMapper.toResponse(requireSubject(organizationId, subjectId));
	}

	@RequirePermission(PermissionCode.SUBJECT_MANAGE)
	@Transactional
	public SubjectResponse updateSubject(Long organizationId, Long subjectId, UpdateSubjectRequest request) {
		tenantValidator.requireOrganization(organizationId);
		Subject subject = requireSubject(organizationId, subjectId);

		String normalizedName = tenantValidator.normalizeRequiredText(request.name(), "Subject name");
		String normalizedCode = tenantValidator.normalizeCode(request.code(), "Subject code");

		if (subjectRepository.existsByOrganizationIdAndCodeIgnoreCaseAndIdNot(
				organizationId, normalizedCode, subjectId)) {
			throw new IllegalStateException("Subject with this code already exists in the organization");
		}

		subject.setName(normalizedName);
		subject.setCode(normalizedCode);
		subject.setDescription(tenantValidator.normalizeOptionalText(request.description()));

		return subjectMapper.toResponse(subjectRepository.save(subject));
	}

	@RequirePermission(PermissionCode.SUBJECT_MANAGE)
	@Transactional
	public SubjectResponse deactivateSubject(Long organizationId, Long subjectId) {
		tenantValidator.requireOrganization(organizationId);
		Subject subject = requireSubject(organizationId, subjectId);
		subject.setActive(false);
		return subjectMapper.toResponse(subjectRepository.save(subject));
	}

	public Subject requireSubject(Long organizationId, Long subjectId) {
		return subjectRepository.findByIdAndOrganizationId(subjectId, organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Subject not found"));
	}
}

package com.side.forge.organization.academic.schoolclass.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.dto.CreateSchoolClassRequest;
import com.side.forge.organization.academic.schoolclass.dto.SchoolClassResponse;
import com.side.forge.organization.academic.schoolclass.dto.UpdateSchoolClassRequest;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.mapper.SchoolClassMapper;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SchoolClassService {

	private final SchoolClassRepository schoolClassRepository;
	private final SchoolClassMapper schoolClassMapper;
	private final AcademicTenantAccessValidator tenantValidator;

	@RequirePermission(PermissionCode.CLASS_MANAGE)
	@Transactional
	public SchoolClassResponse createClass(Long organizationId, CreateSchoolClassRequest request) {
		tenantValidator.requireOrganization(organizationId);

		String normalizedName = tenantValidator.normalizeRequiredText(request.name(), "Class name");
		String normalizedCode = tenantValidator.normalizeCode(request.code(), "Class code");
		int displayOrder = tenantValidator.resolveDisplayOrder(request.displayOrder(), 1);

		if (schoolClassRepository.existsByOrganizationIdAndCodeIgnoreCase(organizationId, normalizedCode)) {
			throw new IllegalStateException("Class with this code already exists in the organization");
		}
		if (schoolClassRepository.existsByOrganizationIdAndNameIgnoreCase(organizationId, normalizedName)) {
			throw new IllegalStateException("Class with this name already exists in the organization");
		}

		SchoolClass schoolClass = schoolClassMapper.toEntity(request);
		schoolClass.setOrganizationId(organizationId);
		schoolClass.setName(normalizedName);
		schoolClass.setCode(normalizedCode);
		schoolClass.setDisplayOrder(displayOrder);
		schoolClass.setDescription(tenantValidator.normalizeOptionalText(request.description()));
		schoolClass.setActive(true);

		return schoolClassMapper.toResponse(schoolClassRepository.save(schoolClass));
	}

	@RequirePermission(PermissionCode.CLASS_VIEW)
	@Transactional(readOnly = true)
	public List<SchoolClassResponse> getClasses(Long organizationId, Boolean active) {
		tenantValidator.requireOrganization(organizationId);

		List<SchoolClass> classes = active == null
				? schoolClassRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(organizationId)
				: schoolClassRepository.findAllByOrganizationIdAndActiveOrderByDisplayOrderAscNameAsc(
						organizationId, active);

		return classes.stream().map(schoolClassMapper::toResponse).toList();
	}

	@RequirePermission(PermissionCode.CLASS_VIEW)
	@Transactional(readOnly = true)
	public SchoolClassResponse getClassById(Long organizationId, Long classId) {
		tenantValidator.requireOrganization(organizationId);
		return schoolClassMapper.toResponse(requireClass(organizationId, classId));
	}

	@RequirePermission(PermissionCode.CLASS_MANAGE)
	@Transactional
	public SchoolClassResponse updateClass(Long organizationId, Long classId, UpdateSchoolClassRequest request) {
		tenantValidator.requireOrganization(organizationId);
		SchoolClass schoolClass = requireClass(organizationId, classId);

		String normalizedName = tenantValidator.normalizeRequiredText(request.name(), "Class name");
		String normalizedCode = tenantValidator.normalizeCode(request.code(), "Class code");
		int displayOrder = tenantValidator.resolveDisplayOrder(request.displayOrder(), schoolClass.getDisplayOrder());

		if (schoolClassRepository.existsByOrganizationIdAndCodeIgnoreCaseAndIdNot(
				organizationId, normalizedCode, classId)) {
			throw new IllegalStateException("Class with this code already exists in the organization");
		}
		if (schoolClassRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(
				organizationId, normalizedName, classId)) {
			throw new IllegalStateException("Class with this name already exists in the organization");
		}

		schoolClass.setName(normalizedName);
		schoolClass.setCode(normalizedCode);
		schoolClass.setDisplayOrder(displayOrder);
		schoolClass.setDescription(tenantValidator.normalizeOptionalText(request.description()));

		return schoolClassMapper.toResponse(schoolClassRepository.save(schoolClass));
	}

	@RequirePermission(PermissionCode.CLASS_MANAGE)
	@Transactional
	public SchoolClassResponse deactivateClass(Long organizationId, Long classId) {
		tenantValidator.requireOrganization(organizationId);
		SchoolClass schoolClass = requireClass(organizationId, classId);
		schoolClass.setActive(false);
		return schoolClassMapper.toResponse(schoolClassRepository.save(schoolClass));
	}

	public SchoolClass requireClass(Long organizationId, Long classId) {
		return schoolClassRepository.findByIdAndOrganizationId(classId, organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));
	}
}

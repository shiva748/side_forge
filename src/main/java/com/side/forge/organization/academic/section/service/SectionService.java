package com.side.forge.organization.academic.section.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.section.dto.CreateSectionRequest;
import com.side.forge.organization.academic.section.dto.SectionResponse;
import com.side.forge.organization.academic.section.dto.UpdateSectionRequest;
import com.side.forge.organization.academic.section.entity.Section;
import com.side.forge.organization.academic.section.mapper.SectionMapper;
import com.side.forge.organization.academic.section.repository.SectionRepository;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.service.AcademicSessionService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final SectionMapper sectionMapper;
    private final AcademicSessionService academicSessionService;
    private final SchoolClassService schoolClassService;
    private final AcademicTenantAccessValidator tenantValidator;

    @RequirePermission(PermissionCode.SECTION_MANAGE)
    @Transactional
    public SectionResponse createSection(Long organizationId, Long sessionId, CreateSectionRequest request) {
        AcademicSession session = requireModifiableSession(organizationId, sessionId);
        SchoolClass schoolClass = requireActiveClass(organizationId, request.classId());

        String normalizedName = tenantValidator.normalizeRequiredText(request.name(), "Section name");
        tenantValidator.validateCapacity(request.capacity());

        if (sectionRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndNameIgnoreCase(
                organizationId, session.getId(), schoolClass.getId(), normalizedName)) {
            throw new IllegalStateException("Section with this name already exists for the class in this academic session");
        }

        Section section = sectionMapper.toEntity(request);
        section.setOrganizationId(organizationId);
        section.setAcademicSessionId(session.getId());
        section.setClassId(schoolClass.getId());
        section.setName(normalizedName);
        section.setCapacity(request.capacity());
        section.setActive(true);

        return sectionMapper.toResponse(sectionRepository.save(section));
    }

    @RequirePermission(PermissionCode.SECTION_VIEW)
    @Transactional(readOnly = true)
    public List<SectionResponse> getSections(Long organizationId, Long sessionId, Long classId, Boolean active) {
        tenantValidator.requireOrganization(organizationId);
        academicSessionService.requireSession(organizationId, sessionId);

        List<Section> sections;
        if (classId != null) {
            schoolClassService.requireClass(organizationId, classId);
            sections = active == null
                    ? sectionRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByNameAsc(
                            organizationId, sessionId, classId)
                    : sectionRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndActiveOrderByNameAsc(
                            organizationId, sessionId, classId, active);
        } else {
            sections = active == null
                    ? sectionRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscNameAsc(
                            organizationId, sessionId)
                    : sectionRepository.findAllByOrganizationIdAndAcademicSessionIdAndActiveOrderByClassIdAscNameAsc(
                            organizationId, sessionId, active);
        }

        return sections.stream().map(sectionMapper::toResponse).toList();
    }

    @RequirePermission(PermissionCode.SECTION_VIEW)
    @Transactional(readOnly = true)
    public SectionResponse getSectionById(Long organizationId, Long sessionId, Long sectionId) {
        tenantValidator.requireOrganization(organizationId);
        academicSessionService.requireSession(organizationId, sessionId);
        return sectionMapper.toResponse(requireSection(organizationId, sessionId, sectionId));
    }

    @RequirePermission(PermissionCode.SECTION_MANAGE)
    @Transactional
    public SectionResponse updateSection(Long organizationId, Long sessionId, Long sectionId,
                                         UpdateSectionRequest request) {
        requireModifiableSession(organizationId, sessionId);
        Section section = requireSection(organizationId, sessionId, sectionId);
        SchoolClass schoolClass = requireActiveClass(organizationId, request.classId());

        String normalizedName = tenantValidator.normalizeRequiredText(request.name(), "Section name");
        tenantValidator.validateCapacity(request.capacity());

        if (sectionRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndNameIgnoreCaseAndIdNot(
                organizationId, sessionId, schoolClass.getId(), normalizedName, sectionId)) {
            throw new IllegalStateException("Section with this name already exists for the class in this academic session");
        }

        section.setClassId(schoolClass.getId());
        section.setName(normalizedName);
        section.setCapacity(request.capacity());

        return sectionMapper.toResponse(sectionRepository.save(section));
    }

    @RequirePermission(PermissionCode.SECTION_MANAGE)
    @Transactional
    public SectionResponse deactivateSection(Long organizationId, Long sessionId, Long sectionId) {
        requireModifiableSession(organizationId, sessionId);
        Section section = requireSection(organizationId, sessionId, sectionId);
        section.setActive(false);
        return sectionMapper.toResponse(sectionRepository.save(section));
    }

    public Section requireSection(Long organizationId, Long sessionId, Long sectionId) {
        return sectionRepository.findByIdAndOrganizationIdAndAcademicSessionId(sectionId, organizationId, sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Section not found"));
    }

    private AcademicSession requireModifiableSession(Long organizationId, Long sessionId) {
        tenantValidator.requireOrganization(organizationId);
        AcademicSession session = academicSessionService.requireSession(organizationId, sessionId);
        if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
            throw new IllegalStateException("Cannot modify sections of a completed academic session");
        }
        return session;
    }

    private SchoolClass requireActiveClass(Long organizationId, Long classId) {
        SchoolClass schoolClass = schoolClassService.requireClass(organizationId, classId);
        if (!schoolClass.isActive()) {
            throw new IllegalStateException("Cannot assign a section to an inactive class");
        }
        return schoolClass;
    }
}
package com.side.forge.organization.academic.classsubject.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.classsubject.dto.AssignClassSubjectRequest;
import com.side.forge.organization.academic.classsubject.dto.ClassSubjectResponse;
import com.side.forge.organization.academic.classsubject.entity.ClassSubject;
import com.side.forge.organization.academic.classsubject.mapper.ClassSubjectMapper;
import com.side.forge.organization.academic.classsubject.repository.ClassSubjectRepository;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.service.SubjectService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClassSubjectService {

	private final ClassSubjectRepository classSubjectRepository;
	private final ClassSubjectMapper classSubjectMapper;
	private final AcademicSessionService sessionService;
	private final SchoolClassService classService;
	private final SubjectService subjectService;
	private final AcademicTenantAccessValidator validator;

	@RequirePermission(PermissionCode.CLASS_SUBJECT_MANAGE)
	@Transactional
	public ClassSubjectResponse assignSubjectToClass(Long orgId, Long sessionId, Long classId,
			AssignClassSubjectRequest request) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		ensureSessionModifiable(session);

		SchoolClass schoolClass = classService.requireClass(orgId, classId);
		if (!schoolClass.isActive()) {
			throw new IllegalStateException("Cannot assign subjects to an inactive class");
		}

		Subject subject = subjectService.requireSubject(orgId, request.subjectId());
		if (!subject.isActive()) {
			throw new IllegalStateException("Cannot assign an inactive subject to a class");
		}

		int displayOrder = validator.resolveDisplayOrder(request.displayOrder(), 1);
		boolean compulsory = request.compulsory() == null || request.compulsory();

		if (classSubjectRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
				orgId, session.getId(), schoolClass.getId(), subject.getId())) {
			throw new IllegalStateException("Subject is already assigned to this class in the academic session");
		}

		ClassSubject assignment = classSubjectMapper.toEntity(request);
		assignment.setOrganizationId(orgId);
		assignment.setAcademicSessionId(session.getId());
		assignment.setClassId(schoolClass.getId());
		assignment.setSubjectId(subject.getId());
		assignment.setCompulsory(compulsory);
		assignment.setDisplayOrder(displayOrder);

		return classSubjectMapper.toResponse(classSubjectRepository.save(assignment));
	}

	@RequirePermission(PermissionCode.CLASS_SUBJECT_VIEW)
	@Transactional(readOnly = true)
	public List<ClassSubjectResponse> getClassSubjects(Long orgId, Long sessionId, Long classId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);
		classService.requireClass(orgId, classId);

		return classSubjectRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByDisplayOrderAscIdAsc(
						orgId, sessionId, classId)
				.stream()
				.map(classSubjectMapper::toResponse)
				.toList();
	}

	@RequirePermission(PermissionCode.CLASS_SUBJECT_MANAGE)
	@Transactional
	public void removeSubjectFromClass(Long orgId, Long sessionId, Long classId, Long subjectId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		ensureSessionModifiable(session);

		classService.requireClass(orgId, classId);
		subjectService.requireSubject(orgId, subjectId);

		ClassSubject assignment = classSubjectRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
						orgId, sessionId, classId, subjectId)
				.orElseThrow(() -> new EntityNotFoundException("Class-subject assignment not found"));

		classSubjectRepository.delete(assignment);
	}

	private void ensureSessionModifiable(AcademicSession session) {
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot modify class-subject assignments of a completed academic session");
		}
	}
}

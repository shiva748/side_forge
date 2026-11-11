package com.side.forge.organization.teacher.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.classsubject.entity.ClassSubject;
import com.side.forge.organization.academic.classsubject.repository.ClassSubjectRepository;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.repository.SubjectRepository;
import com.side.forge.organization.academic.subject.service.SubjectService;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.teacher.dto.*;
import com.side.forge.organization.teacher.entity.*;
import com.side.forge.organization.teacher.repository.*;
import com.side.forge.organization.teacher.service.TeacherService.ActiveTeacherPair;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TeacherAssignmentService {

	private final TeacherClassAssignmentRepository classAssignmentRepository;
	private final TeacherSubjectAssignmentRepository subjectAssignmentRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final StaffRepository staffRepository;
	private final TeacherService teacherService;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final SubjectService subjectService;
	private final SubjectRepository subjectRepository;
	private final ClassSubjectRepository classSubjectRepository;
	private final AcademicTenantAccessValidator validator;

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherClassAssignmentResponse assignTeacherToClass(
			Long orgId, Long sessionId, Long classId, AssignTeacherClassRequest request) {
		AcademicSession session = requireModifiableSession(orgId, sessionId);
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, classId);
		ActiveTeacherPair activeTeacher = teacherService.requireActiveAssignableTeacherForUpdate(
				orgId, request.teacherId());

		if (classAssignmentRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndTeacherId(
				orgId, session.getId(), schoolClass.getId(), activeTeacher.teacher().getId())) {
			throw new IllegalStateException("Teacher is already assigned to this class in the academic session");
		}

		boolean isClassTeacher = Boolean.TRUE.equals(request.classTeacher());
		if (isClassTeacher) {
			clearExistingClassTeacher(orgId, session.getId(), schoolClass.getId(), null);
		}

		TeacherClassAssignment assignment = new TeacherClassAssignment();
		assignment.setOrganizationId(orgId);
		assignment.setAcademicSessionId(session.getId());
		assignment.setClassId(schoolClass.getId());
		assignment.setTeacherId(activeTeacher.teacher().getId());
		assignment.setClassTeacher(isClassTeacher);
		assignment.setRemarks(validator.normalizeOptionalText(request.remarks()));

		TeacherClassAssignment saved = classAssignmentRepository.saveAndFlush(assignment);
		return toClassAssignmentResponse(saved, session, schoolClass, activeTeacher.teacher(), activeTeacher.staff());
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherClassAssignmentResponse> getClassTeachers(Long orgId, Long sessionId, Long classId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);
		classService.requireClass(orgId, classId);

		List<TeacherClassAssignment> rows = classAssignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByClassTeacherDescIdAsc(
						orgId, sessionId, classId);
		return mapClassAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherClassAssignmentResponse> getSessionClassAssignments(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);

		List<TeacherClassAssignment> rows = classAssignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscClassTeacherDescIdAsc(orgId, sessionId);
		return mapClassAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherClassAssignmentResponse> getTeacherClassAssignments(
			Long orgId, Long teacherId, Long academicSessionId) {
		validator.requireOrganization(orgId);
		teacherService.requireTeacher(orgId, teacherId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}

		List<TeacherClassAssignment> rows = academicSessionId == null
				? classAssignmentRepository.findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescClassIdAsc(
						orgId, teacherId)
				: classAssignmentRepository.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAsc(
						orgId, teacherId, academicSessionId);
		return mapClassAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherClassAssignmentResponse updateTeacherClassAssignment(
			Long orgId, Long sessionId, Long classId, Long teacherId,
			UpdateTeacherClassAssignmentRequest request) {
		AcademicSession session = requireModifiableSession(orgId, sessionId);
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, classId);
		ActiveTeacherPair activeTeacher = teacherService.requireActiveAssignableTeacherForUpdate(orgId, teacherId);

		TeacherClassAssignment assignment = classAssignmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassIdAndTeacherId(orgId, sessionId, classId, teacherId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher-class assignment not found"));

		boolean isClassTeacher = request.classTeacher() != null
				? request.classTeacher()
				: assignment.isClassTeacher();
		if (isClassTeacher) {
			clearExistingClassTeacher(orgId, sessionId, classId, teacherId);
		}

		assignment.setClassTeacher(isClassTeacher);
		assignment.setRemarks(validator.normalizeOptionalText(request.remarks()));
		TeacherClassAssignment saved = classAssignmentRepository.save(assignment);
		return toClassAssignmentResponse(saved, session, schoolClass, activeTeacher.teacher(), activeTeacher.staff());
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public void removeTeacherFromClass(Long orgId, Long sessionId, Long classId, Long teacherId) {
		requireModifiableSession(orgId, sessionId);
		classService.requireClass(orgId, classId);
		teacherService.requireTeacher(orgId, teacherId);

		TeacherClassAssignment assignment = classAssignmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassIdAndTeacherId(orgId, sessionId, classId, teacherId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher-class assignment not found"));

		classAssignmentRepository.delete(assignment);
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherSubjectAssignmentResponse assignTeacherToSubject(
			Long orgId, Long sessionId, Long classId, Long subjectId, AssignTeacherSubjectRequest request) {
		AcademicSession session = requireModifiableSession(orgId, sessionId);
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, classId);
		Subject subject = requireActiveSubject(orgId, subjectId);
		ActiveTeacherPair activeTeacher = teacherService.requireActiveAssignableTeacherForUpdate(
				orgId, request.teacherId());

		// Auto-link the active subject to this class in this academic session if not yet linked
		if (!classSubjectRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
				orgId, session.getId(), schoolClass.getId(), subject.getId())) {
			ClassSubject classSubject = new ClassSubject();
			classSubject.setOrganizationId(orgId);
			classSubject.setAcademicSessionId(session.getId());
			classSubject.setClassId(schoolClass.getId());
			classSubject.setSubjectId(subject.getId());
			classSubject.setCompulsory(true);
			classSubject.setDisplayOrder(1);
			classSubjectRepository.saveAndFlush(classSubject);
		}

		if (subjectAssignmentRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
				orgId, session.getId(), schoolClass.getId(), subject.getId(), activeTeacher.teacher().getId())) {
			throw new IllegalStateException(
					"Teacher is already assigned to this subject for the class in the academic session");
		}

		TeacherSubjectAssignment assignment = new TeacherSubjectAssignment();
		assignment.setOrganizationId(orgId);
		assignment.setAcademicSessionId(session.getId());
		assignment.setClassId(schoolClass.getId());
		assignment.setSubjectId(subject.getId());
		assignment.setTeacherId(activeTeacher.teacher().getId());
		assignment.setRemarks(validator.normalizeOptionalText(request.remarks()));

		TeacherSubjectAssignment saved = subjectAssignmentRepository.saveAndFlush(assignment);
		return toSubjectAssignmentResponse(
				saved, session, schoolClass, subject, activeTeacher.teacher(), activeTeacher.staff());
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherSubjectAssignmentResponse> getClassSubjectTeachers(
			Long orgId, Long sessionId, Long classId, Long subjectId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);
		classService.requireClass(orgId, classId);

		List<TeacherSubjectAssignment> rows;
		if (subjectId != null) {
			subjectService.requireSubject(orgId, subjectId);
			rows = subjectAssignmentRepository
					.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdOrderByIdAsc(
							orgId, sessionId, classId, subjectId);
		} else {
			rows = subjectAssignmentRepository
					.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderBySubjectIdAscIdAsc(
							orgId, sessionId, classId);
		}
		return mapSubjectAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherSubjectAssignmentResponse> getSubjectTeachersInSession(
			Long orgId, Long sessionId, Long subjectId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);
		subjectService.requireSubject(orgId, subjectId);

		List<TeacherSubjectAssignment> rows = subjectAssignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndSubjectIdOrderByClassIdAscIdAsc(
						orgId, sessionId, subjectId);
		return mapSubjectAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherSubjectAssignmentResponse> getSessionSubjectAssignments(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);

		List<TeacherSubjectAssignment> rows = subjectAssignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscSubjectIdAscIdAsc(orgId, sessionId);
		return mapSubjectAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherSubjectAssignmentResponse> getTeacherSubjectAssignments(
			Long orgId, Long teacherId, Long academicSessionId, Long classId) {
		validator.requireOrganization(orgId);
		teacherService.requireTeacher(orgId, teacherId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}
		if (classId != null) {
			classService.requireClass(orgId, classId);
		}

		List<TeacherSubjectAssignment> rows;
		if (academicSessionId != null && classId != null) {
			rows = subjectAssignmentRepository
					.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdAndClassIdOrderBySubjectIdAsc(
							orgId, teacherId, academicSessionId, classId);
		} else if (academicSessionId != null) {
			rows = subjectAssignmentRepository
					.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAscSubjectIdAsc(
							orgId, teacherId, academicSessionId);
		} else {
			rows = subjectAssignmentRepository
					.findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescClassIdAscSubjectIdAsc(
							orgId, teacherId);
		}
		return mapSubjectAssignments(orgId, rows);
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherSubjectAssignmentResponse updateTeacherSubjectAssignment(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId,
			UpdateTeacherSubjectAssignmentRequest request) {
		AcademicSession session = requireModifiableSession(orgId, sessionId);
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, classId);
		Subject subject = requireActiveSubject(orgId, subjectId);
		ActiveTeacherPair activeTeacher = teacherService.requireActiveAssignableTeacherForUpdate(orgId, teacherId);

		TeacherSubjectAssignment assignment = subjectAssignmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
						orgId, sessionId, classId, subjectId, teacherId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher-subject assignment not found"));

		assignment.setRemarks(validator.normalizeOptionalText(request.remarks()));
		TeacherSubjectAssignment saved = subjectAssignmentRepository.save(assignment);
		return toSubjectAssignmentResponse(
				saved, session, schoolClass, subject, activeTeacher.teacher(), activeTeacher.staff());
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public void removeTeacherFromSubject(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId) {
		requireModifiableSession(orgId, sessionId);
		classService.requireClass(orgId, classId);
		subjectService.requireSubject(orgId, subjectId);
		teacherService.requireTeacher(orgId, teacherId);

		TeacherSubjectAssignment assignment = subjectAssignmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
						orgId, sessionId, classId, subjectId, teacherId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher-subject assignment not found"));

		subjectAssignmentRepository.delete(assignment);
	}

	private AcademicSession requireModifiableSession(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot modify teacher assignments of a completed academic session");
		}
		return session;
	}

	private SchoolClass requireActiveClassForUpdate(Long orgId, Long classId) {
		SchoolClass schoolClass = classRepository.findByIdAndOrganizationIdForUpdate(classId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));
		if (!schoolClass.isActive()) {
			throw new IllegalStateException("Cannot assign teachers to an inactive class");
		}
		return schoolClass;
	}

	private Subject requireActiveSubject(Long orgId, Long subjectId) {
		Subject subject = subjectService.requireSubject(orgId, subjectId);
		if (!subject.isActive()) {
			throw new IllegalStateException("Cannot assign teachers to an inactive subject");
		}
		return subject;
	}

	private void clearExistingClassTeacher(Long orgId, Long sessionId, Long classId, Long excludedTeacherId) {
		List<TeacherClassAssignment> existing = classAssignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndClassTeacherTrue(orgId, sessionId, classId);
		for (TeacherClassAssignment tca : existing) {
			if (excludedTeacherId == null || !tca.getTeacherId().equals(excludedTeacherId)) {
				tca.setClassTeacher(false);
				classAssignmentRepository.save(tca);
			}
		}
	}

	private List<TeacherClassAssignmentResponse> mapClassAssignments(
			Long orgId, List<TeacherClassAssignment> rows) {
		if (rows.isEmpty()) {
			return List.of();
		}
		Map<Long, AcademicSession> sessionMap = loadSessions(orgId,
				rows.stream().map(TeacherClassAssignment::getAcademicSessionId).collect(Collectors.toSet()));
		Map<Long, SchoolClass> classMap = loadClasses(orgId,
				rows.stream().map(TeacherClassAssignment::getClassId).collect(Collectors.toSet()));
		Map<Long, TeacherProfile> teacherMap = loadTeachers(orgId,
				rows.stream().map(TeacherClassAssignment::getTeacherId).collect(Collectors.toSet()));
		Map<Long, Staff> staffMap = loadStaff(orgId,
				teacherMap.values().stream().map(TeacherProfile::getStaffId).collect(Collectors.toSet()));

		return rows.stream().map(r -> {
			TeacherProfile tp = teacherMap.get(r.getTeacherId());
			Staff st = tp != null ? staffMap.get(tp.getStaffId()) : null;
			return toClassAssignmentResponse(
					r, sessionMap.get(r.getAcademicSessionId()), classMap.get(r.getClassId()), tp, st);
		}).toList();
	}

	private List<TeacherSubjectAssignmentResponse> mapSubjectAssignments(
			Long orgId, List<TeacherSubjectAssignment> rows) {
		if (rows.isEmpty()) {
			return List.of();
		}
		Map<Long, AcademicSession> sessionMap = loadSessions(orgId,
				rows.stream().map(TeacherSubjectAssignment::getAcademicSessionId).collect(Collectors.toSet()));
		Map<Long, SchoolClass> classMap = loadClasses(orgId,
				rows.stream().map(TeacherSubjectAssignment::getClassId).collect(Collectors.toSet()));
		Map<Long, Subject> subjectMap = loadSubjects(orgId,
				rows.stream().map(TeacherSubjectAssignment::getSubjectId).collect(Collectors.toSet()));
		Map<Long, TeacherProfile> teacherMap = loadTeachers(orgId,
				rows.stream().map(TeacherSubjectAssignment::getTeacherId).collect(Collectors.toSet()));
		Map<Long, Staff> staffMap = loadStaff(orgId,
				teacherMap.values().stream().map(TeacherProfile::getStaffId).collect(Collectors.toSet()));

		return rows.stream().map(r -> {
			TeacherProfile tp = teacherMap.get(r.getTeacherId());
			Staff st = tp != null ? staffMap.get(tp.getStaffId()) : null;
			return toSubjectAssignmentResponse(
					r, sessionMap.get(r.getAcademicSessionId()),
					classMap.get(r.getClassId()), subjectMap.get(r.getSubjectId()), tp, st);
		}).toList();
	}

	private Map<Long, AcademicSession> loadSessions(Long orgId, Collection<Long> ids) {
		return sessionRepository.findAllById(ids).stream()
				.filter(s -> orgId.equals(s.getOrganizationId()))
				.collect(Collectors.toMap(AcademicSession::getId, Function.identity()));
	}

	private Map<Long, SchoolClass> loadClasses(Long orgId, Collection<Long> ids) {
		return classRepository.findAllById(ids).stream()
				.filter(c -> orgId.equals(c.getOrganizationId()))
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
	}

	private Map<Long, Subject> loadSubjects(Long orgId, Collection<Long> ids) {
		return subjectRepository.findAllById(ids).stream()
				.filter(s -> orgId.equals(s.getOrganizationId()))
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
	}

	private Map<Long, TeacherProfile> loadTeachers(Long orgId, Collection<Long> ids) {
		return teacherProfileRepository.findAllByOrganizationIdAndIdIn(orgId, ids).stream()
				.collect(Collectors.toMap(TeacherProfile::getId, Function.identity()));
	}

	private Map<Long, Staff> loadStaff(Long orgId, Collection<Long> ids) {
		return staffRepository.findAllByOrganizationIdAndIdIn(orgId, ids).stream()
				.collect(Collectors.toMap(Staff::getId, Function.identity()));
	}

	private TeacherClassAssignmentResponse toClassAssignmentResponse(
			TeacherClassAssignment a, AcademicSession session, SchoolClass sc,
			TeacherProfile tp, Staff st) {
		return new TeacherClassAssignmentResponse(
				a.getId(), a.getOrganizationId(), a.getAcademicSessionId(),
				session != null ? session.getName() : null,
				a.getClassId(), sc != null ? sc.getName() : null, sc != null ? sc.getCode() : null,
				a.getTeacherId(), tp != null ? tp.getStaffId() : null,
				st != null ? st.getEmployeeId() : null,
				st != null ? st.getFirstName() : null, st != null ? st.getLastName() : null,
				a.isClassTeacher(), a.getRemarks(), a.getCreatedAt(), a.getUpdatedAt()
		);
	}

	private TeacherSubjectAssignmentResponse toSubjectAssignmentResponse(
			TeacherSubjectAssignment a, AcademicSession session, SchoolClass sc,
			Subject sub, TeacherProfile tp, Staff st) {
		return new TeacherSubjectAssignmentResponse(
				a.getId(), a.getOrganizationId(), a.getAcademicSessionId(),
				session != null ? session.getName() : null,
				a.getClassId(), sc != null ? sc.getName() : null, sc != null ? sc.getCode() : null,
				a.getSubjectId(), sub != null ? sub.getName() : null, sub != null ? sub.getCode() : null,
				a.getTeacherId(), tp != null ? tp.getStaffId() : null,
				st != null ? st.getEmployeeId() : null,
				st != null ? st.getFirstName() : null, st != null ? st.getLastName() : null,
				a.getRemarks(), a.getCreatedAt(), a.getUpdatedAt()
		);
	}
}

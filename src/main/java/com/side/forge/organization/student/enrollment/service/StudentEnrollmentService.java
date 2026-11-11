package com.side.forge.organization.student.enrollment.service;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.section.entity.Section;
import com.side.forge.organization.academic.section.repository.SectionRepository;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.fees.service.FeeManagementService;
import com.side.forge.organization.student.enrollment.dto.*;
import com.side.forge.organization.student.enrollment.entity.*;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentSpecifications;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.mapper.StudentMapper;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;
import com.side.forge.platform.saas.service.SubscriptionEntitlementService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudentEnrollmentService {

	private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
			"id", "enrollmentDate", "rollNumber", "status", "createdAt"
	);

	private final StudentEnrollmentRepository enrollmentRepository;
	private final StudentService studentService;
	private final StudentRepository studentRepository;
	private final StudentMapper studentMapper;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final SectionRepository sectionRepository;
	private final FeeManagementService feeManagementService;
	private final AcademicTenantAccessValidator validator;
	private final SubscriptionEntitlementService subscriptionEntitlementService;

	@RequirePermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE)
	@Transactional
	public StudentEnrollmentResponse enrollStudent(Long orgId, CreateEnrollmentRequest request) {
		Organization org = validator.requireOrganization(orgId);
		// Acquire pessimistic write lock on the Student row so concurrent enrollment
		// requests for the same student are serialized.
		Student student = studentService.requireStudentForUpdate(orgId, request.studentId());
		if (student.getStatus() != StudentStatus.ACTIVE) {
			throw new IllegalStateException("Only an active student can be enrolled");
		}

		AcademicSession session = sessionService.requireSession(orgId, request.academicSessionId());
		ensureSessionNotCompleted(session);

		SchoolClass schoolClass = requireActiveClass(orgId, request.classId());
		Section section = request.sectionId() != null
				? requireActiveSection(orgId, session.getId(), schoolClass.getId(), request.sectionId())
				: null;

		if (enrollmentRepository.existsByOrganizationIdAndAcademicSessionIdAndStudentId(
				orgId, session.getId(), student.getId())) {
			throw new IllegalStateException("Student is already enrolled in this academic session");
		}

		subscriptionEntitlementService.validateStudentEnrollmentCapacity(orgId, student.getId());

		LocalDate enrollmentDate = request.enrollmentDate() != null
				? request.enrollmentDate()
				: LocalDate.now(validator.resolveZoneId(org));
		if (enrollmentDate.isBefore(student.getDateOfBirth())) {
			throw new IllegalArgumentException("Enrollment date cannot be earlier than student date of birth");
		}

		StudentEnrollment enrollment = new StudentEnrollment();
		enrollment.setOrganizationId(orgId);
		enrollment.setStudentId(student.getId());
		enrollment.setAcademicSessionId(session.getId());
		enrollment.setClassId(schoolClass.getId());
		enrollment.setSectionId(section != null ? section.getId() : null);
		enrollment.setRollNumber(validator.normalizeOptionalText(request.rollNumber()));
		enrollment.setEnrollmentDate(enrollmentDate);
		enrollment.setStatus(EnrollmentStatus.ACTIVE);
		enrollment.setRemarks(validator.normalizeOptionalText(request.remarks()));

		StudentEnrollment saved = enrollmentRepository.saveAndFlush(enrollment);
		feeManagementService.applyPublishedFeeStructureOnEnrollment(orgId, session, saved);
		return toResponse(saved, session, schoolClass, section, studentMapper.toResponse(student));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<StudentEnrollmentResponse> getEnrollments(
			Long orgId, Long academicSessionId, Long classId, Long studentId,
			EnrollmentStatus status, int page, int size, String sortBy, String sortDir) {
		return getEnrollments(orgId, academicSessionId, classId, null, studentId, status, page, size, sortBy, sortDir);
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<StudentEnrollmentResponse> getEnrollments(
			Long orgId, Long academicSessionId, Long classId, Long sectionId, Long studentId,
			EnrollmentStatus status, int page, int size, String sortBy, String sortDir) {
		validator.requireOrganization(orgId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}
		if (classId != null) {
			classService.requireClass(orgId, classId);
		}
		if (studentId != null) {
			studentService.requireStudent(orgId, studentId);
		}

		Pageable pageable = buildPageable(page, size, sortBy, sortDir);
		Specification<StudentEnrollment> spec = StudentEnrollmentSpecifications.withFilters(
				orgId, academicSessionId, classId, sectionId, studentId, status);

		Page<StudentEnrollment> rawPage = enrollmentRepository.findAll(spec, pageable);
		return toPagedResponses(orgId, rawPage);
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public StudentEnrollmentResponse getEnrollmentById(Long orgId, Long enrollmentId) {
		validator.requireOrganization(orgId);
		StudentEnrollment enrollment = requireEnrollment(orgId, enrollmentId);
		AcademicSession session = sessionService.requireSession(orgId, enrollment.getAcademicSessionId());
		SchoolClass schoolClass = classService.requireClass(orgId, enrollment.getClassId());
		Section section = enrollment.getSectionId() != null
				? sectionRepository.findByIdAndOrganizationIdAndAcademicSessionId(
						enrollment.getSectionId(), orgId, enrollment.getAcademicSessionId()).orElse(null)
				: null;
		Student student = studentService.requireStudent(orgId, enrollment.getStudentId());
		return toResponse(enrollment, session, schoolClass, section, studentMapper.toResponse(student));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public List<StudentEnrollmentResponse> getStudentEnrollmentHistory(Long orgId, Long studentId) {
		validator.requireOrganization(orgId);
		Student student = studentService.requireStudent(orgId, studentId);
		StudentResponse studentDto = studentMapper.toResponse(student);

		List<StudentEnrollment> enrollments = enrollmentRepository
				.findAllByOrganizationIdAndStudentIdOrderByEnrollmentDateDescIdDesc(orgId, studentId);
		if (enrollments.isEmpty()) {
			return List.of();
		}

		Map<Long, AcademicSession> sessionMap = loadSessions(orgId,
				enrollments.stream().map(StudentEnrollment::getAcademicSessionId).collect(Collectors.toSet()));
		Map<Long, SchoolClass> classMap = loadClasses(orgId,
				enrollments.stream().map(StudentEnrollment::getClassId).collect(Collectors.toSet()));
		Map<Long, Section> sectionMap = loadSections(orgId,
				enrollments.stream().map(StudentEnrollment::getSectionId).filter(Objects::nonNull).collect(Collectors.toSet()));

		return enrollments.stream()
				.map(e -> toResponse(e, sessionMap.get(e.getAcademicSessionId()),
						classMap.get(e.getClassId()),
						e.getSectionId() != null ? sectionMap.get(e.getSectionId()) : null,
						studentDto))
				.toList();
	}

	@RequirePermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE)
	@Transactional
	public StudentEnrollmentResponse updateEnrollment(
			Long orgId, Long enrollmentId, UpdateEnrollmentRequest request) {
		validator.requireOrganization(orgId);
		StudentEnrollment enrollment = requireEnrollment(orgId, enrollmentId);
		AcademicSession session = sessionService.requireSession(orgId, enrollment.getAcademicSessionId());
		ensureSessionNotCompleted(session);

		if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
			throw new IllegalStateException("Only an active enrollment can be modified");
		}

		SchoolClass schoolClass = requireActiveClass(orgId, request.classId());
		Section section = request.sectionId() != null
				? requireActiveSection(orgId, session.getId(), schoolClass.getId(), request.sectionId())
				: null;
		Student student = studentService.requireStudent(orgId, enrollment.getStudentId());

		if (request.enrollmentDate() != null) {
			if (request.enrollmentDate().isBefore(student.getDateOfBirth())) {
				throw new IllegalArgumentException("Enrollment date cannot be earlier than student date of birth");
			}
			enrollment.setEnrollmentDate(request.enrollmentDate());
		}

		Long previousClassId = enrollment.getClassId();
		enrollment.setClassId(schoolClass.getId());
		enrollment.setSectionId(section != null ? section.getId() : null);
		enrollment.setRollNumber(validator.normalizeOptionalText(request.rollNumber()));
		enrollment.setRemarks(validator.normalizeOptionalText(request.remarks()));

		StudentEnrollment saved = enrollmentRepository.saveAndFlush(enrollment);
		if (!previousClassId.equals(saved.getClassId())) {
			feeManagementService.handleClassChangeFeeAdjustment(
					orgId, session, saved, previousClassId, saved.getClassId(), saved.getEnrollmentDate());
		}
		return toResponse(saved, session, schoolClass, section, studentMapper.toResponse(student));
	}

	@RequirePermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE)
	@Transactional
	public StudentEnrollmentResponse changeEnrollmentStatus(
			Long orgId, Long enrollmentId, ChangeEnrollmentStatusRequest request) {
		validator.requireOrganization(orgId);
		StudentEnrollment enrollment = requireEnrollment(orgId, enrollmentId);
		AcademicSession session = sessionService.requireSession(orgId, enrollment.getAcademicSessionId());
		ensureSessionNotCompleted(session);

		validateStatusTransition(enrollment.getStatus(), request.status());

		enrollment.setStatus(request.status());
		if (request.remarks() != null) {
			enrollment.setRemarks(validator.normalizeOptionalText(request.remarks()));
		}

		SchoolClass schoolClass = classService.requireClass(orgId, enrollment.getClassId());
		Section section = enrollment.getSectionId() != null
				? sectionRepository.findByIdAndOrganizationIdAndAcademicSessionId(
						enrollment.getSectionId(), orgId, enrollment.getAcademicSessionId()).orElse(null)
				: null;
		Student student = studentService.requireStudent(orgId, enrollment.getStudentId());
		StudentEnrollment saved = enrollmentRepository.save(enrollment);
		return toResponse(saved, session, schoolClass, section, studentMapper.toResponse(student));
	}

	public StudentEnrollment requireEnrollment(Long orgId, Long enrollmentId) {
		return enrollmentRepository.findByIdAndOrganizationId(enrollmentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student enrollment not found"));
	}

	private void validateStatusTransition(EnrollmentStatus current, EnrollmentStatus target) {
		if (current == target) {
			throw new IllegalStateException("Enrollment is already in status " + target);
		}
		if (current != EnrollmentStatus.ACTIVE) {
			throw new IllegalStateException(
					"Cannot transition enrollment from historical status " + current + " to " + target);
		}
	}

	private void ensureSessionNotCompleted(AcademicSession session) {
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot enroll or modify enrollment records in a completed academic session");
		}
	}

	private SchoolClass requireActiveClass(Long orgId, Long classId) {
		SchoolClass schoolClass = classService.requireClass(orgId, classId);
		if (!schoolClass.isActive()) {
			throw new IllegalStateException("Cannot enroll student into an inactive class");
		}
		return schoolClass;
	}

	private Section requireActiveSection(Long orgId, Long sessionId, Long classId, Long sectionId) {
		Section section = sectionRepository
				.findByIdAndOrganizationIdAndAcademicSessionIdAndClassId(sectionId, orgId, sessionId, classId)
				.orElseThrow(() -> new EntityNotFoundException(
						"Section not found for the selected class and academic session"));
		if (!section.isActive()) {
			throw new IllegalStateException("Cannot enroll student into an inactive section");
		}
		return section;
	}

	private PagedResponse<StudentEnrollmentResponse> toPagedResponses(Long orgId, Page<StudentEnrollment> rawPage) {
		List<StudentEnrollment> content = rawPage.getContent();
		if (content.isEmpty()) {
			return new PagedResponse<>(
					List.of(), rawPage.getNumber(), rawPage.getSize(),
					rawPage.getTotalElements(), rawPage.getTotalPages(),
					rawPage.isFirst(), rawPage.isLast());
		}

		Set<Long> sessionIds = content.stream().map(StudentEnrollment::getAcademicSessionId).collect(Collectors.toSet());
		Set<Long> classIds = content.stream().map(StudentEnrollment::getClassId).collect(Collectors.toSet());
		Set<Long> sectionIds = content.stream()
				.map(StudentEnrollment::getSectionId)
				.filter(Objects::nonNull)
				.collect(Collectors.toSet());
		Set<Long> studentIds = content.stream().map(StudentEnrollment::getStudentId).collect(Collectors.toSet());

		Map<Long, AcademicSession> sessionMap = loadSessions(orgId, sessionIds);
		Map<Long, SchoolClass> classMap = loadClasses(orgId, classIds);
		Map<Long, Section> sectionMap = loadSections(orgId, sectionIds);
		Map<Long, StudentResponse> studentMap = studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds)
				.stream()
				.map(studentMapper::toResponse)
				.collect(Collectors.toMap(StudentResponse::id, Function.identity()));

		List<StudentEnrollmentResponse> mapped = content.stream()
				.map(e -> toResponse(e, sessionMap.get(e.getAcademicSessionId()),
						classMap.get(e.getClassId()),
						e.getSectionId() != null ? sectionMap.get(e.getSectionId()) : null,
						studentMap.get(e.getStudentId())))
				.toList();

		return new PagedResponse<>(
				mapped, rawPage.getNumber(), rawPage.getSize(),
				rawPage.getTotalElements(), rawPage.getTotalPages(),
				rawPage.isFirst(), rawPage.isLast());
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

	private Map<Long, Section> loadSections(Long orgId, Collection<Long> ids) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		return sectionRepository.findAllByOrganizationIdAndIdIn(orgId, ids).stream()
				.collect(Collectors.toMap(Section::getId, Function.identity()));
	}

	private StudentEnrollmentResponse toResponse(
			StudentEnrollment e, AcademicSession session, SchoolClass schoolClass, Section section, StudentResponse student) {
		return new StudentEnrollmentResponse(
				e.getId(),
				e.getOrganizationId(),
				e.getStudentId(),
				e.getAcademicSessionId(),
				session != null ? session.getName() : null,
				e.getClassId(),
				schoolClass != null ? schoolClass.getName() : null,
				schoolClass != null ? schoolClass.getCode() : null,
				e.getSectionId(),
				section != null ? section.getName() : null,
				e.getRollNumber(),
				e.getEnrollmentDate(),
				e.getStatus(),
				e.getRemarks(),
				student,
				e.getCreatedAt(),
				e.getUpdatedAt());
	}

	private Pageable buildPageable(int page, int size, String sortBy, String sortDir) {
		if (page < 0) {
			throw new IllegalArgumentException("Page index must not be negative");
		}
		if (size <= 0 || size > 100) {
			throw new IllegalArgumentException("Page size must be between 1 and 100");
		}
		String field = (sortBy == null || sortBy.isBlank()) ? "enrollmentDate" : sortBy.trim();
		if (!ALLOWED_SORT_FIELDS.contains(field)) {
			throw new IllegalArgumentException("Unsupported sort field: " + field);
		}
		Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
		return PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by(Sort.Direction.ASC, "id")));
	}
}

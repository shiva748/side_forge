package com.side.forge.organization.homework.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.organization.academic.classsubject.repository.ClassSubjectRepository;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.*;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.repository.SubjectRepository;
import com.side.forge.organization.academic.subject.service.SubjectService;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.homework.dto.HomeworkDtos.*;
import com.side.forge.organization.homework.entity.*;
import com.side.forge.organization.homework.repository.*;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.student.enrollment.entity.*;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.profile.entity.*;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.repository.*;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HomeworkService {

	private final HomeworkAssignmentRepository homeworkRepository;
	private final StudentHomeworkSubmissionRepository submissionRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final SubjectService subjectService;
	private final SubjectRepository subjectRepository;
	private final ClassSubjectRepository classSubjectRepository;
	private final StaffRepository staffRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final TeacherClassAssignmentRepository teacherClassAssignmentRepository;
	private final TeacherSubjectAssignmentRepository teacherSubjectAssignmentRepository;
	private final StudentRepository studentRepository;
	private final StudentEnrollmentRepository enrollmentRepository;
	@RequirePermission(PermissionCode.HOMEWORK_MANAGE)
	@Transactional
	public HomeworkAssignmentResponse createHomework(Long orgId, CreateHomeworkRequest request) {
		Organization org = validator.requireOrganization(orgId);
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		SchoolClass schoolClass = classService.requireClass(orgId, request.classId());
		if (!schoolClass.isActive()) {
			throw new IllegalStateException("Cannot create homework for an inactive class");
		}
		Subject subject = subjectService.requireSubject(orgId, request.subjectId());
		if (!subject.isActive()) {
			throw new IllegalStateException("Cannot create homework for an inactive subject");
		}
		if (!classSubjectRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
				orgId, session.getId(), schoolClass.getId(), subject.getId())) {
			throw new IllegalStateException("Subject is not assigned to the selected class in this academic session");
		}
		if (request.dueDate().isBefore(request.assignedDate())) {
			throw new IllegalArgumentException("Submission due date cannot be earlier than assigned date");
		}

		TeacherProfile teacher = resolveAndAuthorizeTeacherForClassSubject(
				orgId, session.getId(), schoolClass.getId(), subject.getId(), request.teacherId());

		HomeworkAssignment hw = new HomeworkAssignment();
		hw.setOrganizationId(orgId);
		hw.setAcademicSessionId(session.getId());
		hw.setClassId(schoolClass.getId());
		hw.setSubjectId(subject.getId());
		hw.setTeacherId(teacher.getId());
		hw.setTitle(validator.normalizeRequiredText(request.title(), "Homework title"));
		hw.setDescription(validator.normalizeRequiredText(request.description(), "Homework description"));
		hw.setAssignedDate(request.assignedDate());
		hw.setDueDate(request.dueDate());
		hw.setMaxMarks(request.maxMarks());
		hw.setAllowResubmission(request.allowResubmission() == null || request.allowResubmission());
		hw.setLateSubmissionPolicy(request.lateSubmissionPolicy() != null
				? request.lateSubmissionPolicy()
				: LateSubmissionPolicy.REJECT_LATE);
		hw.setReferenceAttachments(serializeAttachments(request.referenceAttachments()));
		hw.setStatus(HomeworkStatus.ACTIVE);
		hw.setCreatedBy(currentUser.getUserId());
		hw = homeworkRepository.saveAndFlush(hw);

		// Snapshot eligible enrolled students in the class at assignment creation time
		List<StudentEnrollment> activeEnrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(orgId, session.getId(), schoolClass.getId())
				.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).toList();
		Set<Long> studentIds = activeEnrollments.stream().map(StudentEnrollment::getStudentId).collect(Collectors.toSet());
		Map<Long, Student> studentMap = studentIds.isEmpty() ? Map.of()
				: studentRepository.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds).stream()
						.collect(Collectors.toMap(Student::getId, Function.identity()));

		List<StudentHomeworkSubmission> toSave = new ArrayList<>();
		for (StudentEnrollment enrollment : activeEnrollments) {
			Student st = studentMap.get(enrollment.getStudentId());
			if (st != null && st.getStatus() == StudentStatus.ACTIVE) {
				StudentHomeworkSubmission sub = new StudentHomeworkSubmission();
				sub.setOrganizationId(orgId);
				sub.setAcademicSessionId(session.getId());
				sub.setHomeworkId(hw.getId());
				sub.setClassId(schoolClass.getId());
				sub.setEnrollmentId(enrollment.getId());
				sub.setStudentId(st.getId());
				sub.setStatus(HomeworkSubmissionStatus.PENDING);
				toSave.add(sub);
			}
		}
		List<StudentHomeworkSubmission> savedSubs = submissionRepository.saveAllAndFlush(toSave);
		return toHomeworkResponse(orgId, hw, session, schoolClass, subject, teacher, savedSubs, hw.getAssignedDate());
	}
	@RequirePermission(PermissionCode.HOMEWORK_MANAGE)
	@Transactional
	public HomeworkAssignmentResponse updateHomework(
			Long orgId, Long homeworkId, UpdateHomeworkRequest request) {
		Organization org = validator.requireOrganization(orgId);
		HomeworkAssignment hw = homeworkRepository.findByIdAndOrganizationIdForUpdate(homeworkId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Homework assignment not found"));
		AcademicSession session = requireModifiableSession(orgId, hw.getAcademicSessionId());
		verifyTeacherCanManageHomework(orgId, hw);

		if (request.dueDate().isBefore(request.assignedDate())) {
			throw new IllegalArgumentException("Submission due date cannot be earlier than assigned date");
		}

		hw.setTitle(validator.normalizeRequiredText(request.title(), "Homework title"));
		hw.setDescription(validator.normalizeRequiredText(request.description(), "Homework description"));
		hw.setAssignedDate(request.assignedDate());
		hw.setDueDate(request.dueDate());
		hw.setMaxMarks(request.maxMarks());
		if (request.allowResubmission() != null) {
			hw.setAllowResubmission(request.allowResubmission());
		}
		if (request.lateSubmissionPolicy() != null) {
			hw.setLateSubmissionPolicy(request.lateSubmissionPolicy());
		}
		if (request.referenceAttachments() != null) {
			hw.setReferenceAttachments(serializeAttachments(request.referenceAttachments()));
		}
		if (request.status() != null) {
			hw.setStatus(request.status());
		}

		HomeworkAssignment saved = homeworkRepository.saveAndFlush(hw);
		SchoolClass sc = classService.requireClass(orgId, saved.getClassId());
		Subject subj = subjectService.requireSubject(orgId, saved.getSubjectId());
		TeacherProfile teacher = teacherProfileRepository.findByIdAndOrganizationId(saved.getTeacherId(), orgId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher profile not found"));
		List<StudentHomeworkSubmission> subs = submissionRepository
				.findAllByOrganizationIdAndHomeworkIdOrderByStudentIdAsc(orgId, saved.getId());
		return toHomeworkResponse(orgId, saved, session, sc, subj, teacher, subs, LocalDate.now(validator.resolveZoneId(org)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_MANAGE)
	@Transactional
	public void deleteHomework(Long orgId, Long homeworkId) {
		validator.requireOrganization(orgId);
		HomeworkAssignment hw = homeworkRepository.findByIdAndOrganizationIdForUpdate(homeworkId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Homework assignment not found"));
		requireModifiableSession(orgId, hw.getAcademicSessionId());
		verifyTeacherCanManageHomework(orgId, hw);

		List<StudentHomeworkSubmission> subs = submissionRepository
				.findAllByOrganizationIdAndHomeworkIdOrderByStudentIdAsc(orgId, hw.getId());
		boolean hasSubmissions = subs.stream().anyMatch(
				s -> s.getSubmissionCount() > 0
						|| s.getStatus() == HomeworkSubmissionStatus.SUBMITTED
						|| s.getStatus() == HomeworkSubmissionStatus.EVALUATED);
		if (hasSubmissions) {
			throw new IllegalStateException("Cannot delete homework after students have submitted work");
		}
		submissionRepository.deleteAll(subs);
		homeworkRepository.delete(hw);
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@Transactional(readOnly = true)
	public HomeworkAssignmentResponse getHomeworkById(Long orgId, Long homeworkId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		HomeworkAssignment hw = requireHomework(orgId, homeworkId);
		if (!isSchoolAdminOrPrincipal() && !currentUser.hasPermission(PermissionCode.HOMEWORK_SUBMIT.getValue())) {
			verifyTeacherCanManageHomework(orgId, hw);
		}
		AcademicSession session = sessionService.requireSession(orgId, hw.getAcademicSessionId());
		SchoolClass sc = classService.requireClass(orgId, hw.getClassId());
		Subject subj = subjectService.requireSubject(orgId, hw.getSubjectId());
		TeacherProfile teacher = teacherProfileRepository.findByIdAndOrganizationId(hw.getTeacherId(), orgId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher profile not found"));
		List<StudentHomeworkSubmission> subs = submissionRepository
				.findAllByOrganizationIdAndHomeworkIdOrderByStudentIdAsc(orgId, hw.getId());
		LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));
		return toHomeworkResponse(orgId, hw, session, sc, subj, teacher, subs, ref);
	}
	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@Transactional(readOnly = true)
	public List<HomeworkAssignmentResponse> getSessionHomework(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));

		List<HomeworkAssignment> rows = homeworkRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByAssignedDateDescIdDesc(orgId, session.getId())
				.stream()
				.filter(h -> classId == null || h.getClassId().equals(classId))
				.filter(h -> subjectId == null || h.getSubjectId().equals(subjectId))
				.filter(h -> teacherId == null || h.getTeacherId().equals(teacherId))
				.toList();

		if (!isSchoolAdminOrPrincipal()) {
			Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
			if (ownTeacher.isPresent()) {
				Long tId = ownTeacher.get().getId();
				rows = rows.stream()
						.filter(h -> h.getTeacherId().equals(tId)
								|| isTeacherAuthorizedForClassSubject(orgId, session.getId(), h.getClassId(), h.getSubjectId(), tId))
						.toList();
			}
		}

		Map<Long, SchoolClass> classMap = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Subject> subjMap = subjectRepository.findAllByOrganizationIdOrderByNameAsc(orgId).stream()
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
		Map<Long, TeacherProfile> teacherMap = teacherProfileRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(TeacherProfile::getId, Function.identity()));
		Map<Long, List<StudentHomeworkSubmission>> subsByHw = submissionRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByHomeworkIdAscStudentIdAsc(orgId, session.getId())
				.stream().collect(Collectors.groupingBy(StudentHomeworkSubmission::getHomeworkId));

		return rows.stream()
				.map(h -> toHomeworkResponse(
						orgId, h, session, classMap.get(h.getClassId()), subjMap.get(h.getSubjectId()),
						teacherMap.get(h.getTeacherId()), subsByHw.getOrDefault(h.getId(), List.of()), ref))
				.toList();
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@Transactional(readOnly = true)
	public List<StudentHomeworkSubmissionResponse> getHomeworkRosterAndSubmissions(
			Long orgId, Long homeworkId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		if (!isSchoolAdminOrPrincipal() && !currentUser.hasPermission(PermissionCode.HOMEWORK_EVALUATE.getValue())) {
			throw new AccessDeniedException("Only authorized teachers and school administrators can view the class submission roster");
		}
		HomeworkAssignment hw = requireHomework(orgId, homeworkId);
		verifyTeacherCanManageHomework(orgId, hw);

		LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));
		List<StudentHomeworkSubmission> subs = submissionRepository
				.findAllByOrganizationIdAndHomeworkIdOrderByStudentIdAsc(orgId, hw.getId());
		return mapSubmissionResponses(orgId, Map.of(hw.getId(), hw), subs, ref);
	}
	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@Transactional(readOnly = true)
	public List<StudentHomeworkSubmissionResponse> getStudentHomeworkList(
			Long orgId, Long requestedStudentId, Long academicSessionId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		Student student = resolveAndAuthorizeTargetStudent(orgId, requestedStudentId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}
		LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));

		List<StudentHomeworkSubmission> subs = academicSessionId == null
				? submissionRepository.findAllByOrganizationIdAndStudentIdOrderByIdDesc(orgId, student.getId())
				: submissionRepository.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByIdDesc(
						orgId, academicSessionId, student.getId());

		Set<Long> hwIds = subs.stream().map(StudentHomeworkSubmission::getHomeworkId).collect(Collectors.toSet());
		Map<Long, HomeworkAssignment> hwMap = hwIds.isEmpty() ? Map.of()
				: homeworkRepository.findAllById(hwIds).stream()
						.filter(h -> h.getOrganizationId().equals(orgId))
						.collect(Collectors.toMap(HomeworkAssignment::getId, Function.identity()));

		return mapSubmissionResponses(orgId, hwMap, subs, ref);
	}

	@RequirePermission(PermissionCode.HOMEWORK_SUBMIT)
	@Transactional
	public StudentHomeworkSubmissionResponse submitHomework(
			Long orgId, Long homeworkId, SubmitHomeworkRequest request) {
		Organization org = validator.requireOrganization(orgId);
		HomeworkAssignment hw = requireHomework(orgId, homeworkId);
		if (hw.getStatus() != HomeworkStatus.ACTIVE) {
			throw new IllegalStateException("Cannot submit work for a closed homework assignment");
		}
		requireModifiableSession(orgId, hw.getAcademicSessionId());

		Student student = resolveAndAuthorizeTargetStudent(orgId, request.studentId());
		StudentHomeworkSubmission sub = submissionRepository
				.findByOrganizationIdAndHomeworkIdAndStudentIdForUpdate(orgId, hw.getId(), student.getId())
				.orElseThrow(() -> new AccessDeniedException("This homework is not assigned to the student"));

		String text = validator.normalizeOptionalText(request.submissionText());
		List<String> attachments = request.attachments() != null
				? request.attachments().stream().filter(a -> a != null && !a.isBlank()).map(String::trim).toList()
				: List.of();
		if (text == null && attachments.isEmpty()) {
			throw new IllegalArgumentException("Homework submission must include text or at least one file attachment");
		}

		LocalDate subDate = request.submissionDate() != null
				? request.submissionDate()
				: LocalDate.now(validator.resolveZoneId(org));
		boolean afterDeadline = subDate.isAfter(hw.getDueDate());

		if (sub.getStatus() == HomeworkSubmissionStatus.EVALUATED) {
			throw new IllegalStateException("Cannot resubmit homework that has already been evaluated");
		}
		if (sub.getSubmissionCount() > 0) {
			if (!hw.isAllowResubmission()) {
				throw new IllegalStateException("Resubmission is not permitted for this homework assignment");
			}
			if (afterDeadline) {
				throw new IllegalStateException("Resubmission is only permitted before the submission deadline");
			}
			sub.setLastResubmittedAt(Instant.now());
		} else {
			if (afterDeadline && hw.getLateSubmissionPolicy() == LateSubmissionPolicy.REJECT_LATE) {
				throw new IllegalStateException("Submission deadline has passed and late submissions are not accepted");
			}
			sub.setSubmittedAt(Instant.now());
		}

		sub.setSubmissionText(text);
		sub.setSubmissionAttachments(serializeAttachments(attachments));
		sub.setSubmissionDate(subDate);
		sub.setSubmissionCount(sub.getSubmissionCount() + 1);
		sub.setLateSubmission(afterDeadline);
		sub.setStatus(HomeworkSubmissionStatus.SUBMITTED);

		StudentHomeworkSubmission saved = submissionRepository.saveAndFlush(sub);
		return mapSubmissionResponses(orgId, Map.of(hw.getId(), hw), List.of(saved), subDate).getFirst();
	}
	@RequirePermission(PermissionCode.HOMEWORK_EVALUATE)
	@Transactional
	public StudentHomeworkSubmissionResponse evaluateSubmission(
			Long orgId, Long homeworkId, Long submissionId, EvaluateHomeworkSubmissionRequest request) {
		Organization org = validator.requireOrganization(orgId);
		HomeworkAssignment hw = requireHomework(orgId, homeworkId);
		requireModifiableSession(orgId, hw.getAcademicSessionId());
		verifyTeacherCanManageHomework(orgId, hw);

		StudentHomeworkSubmission sub = submissionRepository.findByIdAndOrganizationId(submissionId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Homework submission record not found"));
		if (!sub.getHomeworkId().equals(hw.getId())) {
			throw new IllegalArgumentException("Submission record does not belong to the specified homework assignment");
		}
		if (sub.getSubmissionCount() == 0 && sub.getStatus() == HomeworkSubmissionStatus.PENDING) {
			throw new IllegalStateException("Cannot evaluate a homework record before the student has submitted work");
		}
		if (request.marksAwarded() != null) {
			if (hw.getMaxMarks() != null && request.marksAwarded().compareTo(hw.getMaxMarks()) > 0) {
				throw new IllegalArgumentException(
						"Awarded marks (" + request.marksAwarded() + ") cannot exceed maximum marks (" + hw.getMaxMarks() + ")");
			}
		}

		sub.setMarksAwarded(request.marksAwarded());
		sub.setTeacherFeedback(validator.normalizeOptionalText(request.feedback()));
		sub.setStatus(HomeworkSubmissionStatus.EVALUATED);
		sub.setEvaluatedBy(currentUser.getUserId());
		sub.setEvaluatedAt(Instant.now());

		StudentHomeworkSubmission saved = submissionRepository.saveAndFlush(sub);
		LocalDate ref = LocalDate.now(validator.resolveZoneId(org));
		return mapSubmissionResponses(orgId, Map.of(hw.getId(), hw), List.of(saved), ref).getFirst();
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@Transactional(readOnly = true)
	public TeacherHomeworkDashboardResponse getTeacherHomeworkDashboard(
			Long orgId, Long academicSessionId, Long requestedTeacherId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		AcademicSession session = resolveSession(orgId, academicSessionId);
		LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));

		TeacherProfile teacher = resolveTargetTeacherForDashboard(orgId, requestedTeacherId);
		String teacherName = resolveTeacherName(orgId, teacher);

		List<HomeworkAssignmentResponse> assignments = getSessionHomework(
				orgId, session.getId(), null, null, teacher.getId(), ref);

		int totalAssignments = assignments.size();
		int pending = assignments.stream().mapToInt(HomeworkAssignmentResponse::pendingCount).sum();
		int overdue = assignments.stream().mapToInt(HomeworkAssignmentResponse::overdueCount).sum();
		int awaitingEval = assignments.stream().mapToInt(HomeworkAssignmentResponse::submittedCount).sum();
		int evaluated = assignments.stream().mapToInt(HomeworkAssignmentResponse::evaluatedCount).sum();
		int totalSubmitted = awaitingEval + evaluated;

		return new TeacherHomeworkDashboardResponse(
				orgId, session.getId(), teacher.getId(), teacherName, ref,
				totalAssignments, pending, totalSubmitted, overdue, awaitingEval, evaluated,
				assignments);
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@Transactional(readOnly = true)
	public StudentHomeworkDashboardResponse getStudentHomeworkDashboard(
			Long orgId, Long academicSessionId, Long requestedStudentId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		AcademicSession session = resolveSession(orgId, academicSessionId);
		LocalDate ref = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));

		Student student = resolveAndAuthorizeTargetStudent(orgId, requestedStudentId);
		List<StudentHomeworkSubmissionResponse> items = getStudentHomeworkList(
				orgId, student.getId(), session.getId(), ref);

		int pending = 0, overdue = 0, submitted = 0, evaluated = 0;
		for (StudentHomeworkSubmissionResponse item : items) {
			switch (item.status()) {
				case PENDING -> pending++;
				case OVERDUE -> overdue++;
				case SUBMITTED -> submitted++;
				case EVALUATED -> evaluated++;
			}
		}

		return new StudentHomeworkDashboardResponse(
				orgId, session.getId(), student.getId(), student.getAdmissionNumber(), fullName(student),
				ref, items.size(), pending, overdue, submitted, evaluated, items);
	}
	private AcademicSession requireModifiableSession(Long orgId, Long sessionId) {
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot modify homework in a completed academic session");
		}
		return session;
	}

	private AcademicSession resolveSession(Long orgId, Long academicSessionId) {
		if (academicSessionId != null) {
			return sessionService.requireSession(orgId, academicSessionId);
		}
		List<AcademicSession> active = sessionRepository
				.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(orgId, AcademicSessionStatus.ACTIVE);
		if (!active.isEmpty()) {
			return active.getFirst();
		}
		List<AcademicSession> all = sessionRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		if (!all.isEmpty()) {
			return all.getFirst();
		}
		throw new EntityNotFoundException("No academic session found for organization");
	}

	private HomeworkAssignment requireHomework(Long orgId, Long homeworkId) {
		return homeworkRepository.findByIdAndOrganizationId(homeworkId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Homework assignment not found"));
	}

	private boolean isSchoolAdminOrPrincipal() {
		return currentUser.hasPermission(PermissionCode.SCHOOL_UPDATE.getValue())
				|| currentUser.hasPermission(PermissionCode.CLASS_MANAGE.getValue())
				|| currentUser.hasPermission(PermissionCode.TEACHER_MANAGE.getValue());
	}

	private Optional<TeacherProfile> resolveCurrentTeacherOptional(Long orgId) {
		if (currentUser.getUserId() == null) {
			return Optional.empty();
		}
		return staffRepository.findByOrganizationIdAndUserId(orgId, currentUser.getUserId())
				.flatMap(s -> teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, s.getId()));
	}

	private boolean isTeacherAuthorizedForClassSubject(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId) {
		return teacherSubjectAssignmentRepository
				.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
						orgId, sessionId, classId, subjectId, teacherId)
				|| teacherClassAssignmentRepository
						.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndTeacherId(
								orgId, sessionId, classId, teacherId);
	}

	private TeacherProfile resolveAndAuthorizeTeacherForClassSubject(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long requestedTeacherId) {
		Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
		TeacherProfile target;
		if (!isSchoolAdminOrPrincipal()) {
			if (ownTeacher.isEmpty()) {
				throw new AccessDeniedException("Current user is not linked to a teacher profile in this organization");
			}
			if (requestedTeacherId != null && !ownTeacher.get().getId().equals(requestedTeacherId)) {
				throw new AccessDeniedException("Teachers cannot create homework on behalf of another teacher");
			}
			target = ownTeacher.get();
		} else if (requestedTeacherId != null) {
			target = teacherProfileRepository.findByIdAndOrganizationId(requestedTeacherId, orgId)
					.orElseThrow(() -> new EntityNotFoundException("Teacher profile not found"));
		} else if (ownTeacher.isPresent()) {
			target = ownTeacher.get();
		} else {
			throw new IllegalArgumentException("teacherId is required when creating homework as an administrator");
		}

		if (!teacherSubjectAssignmentRepository
				.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
						orgId, sessionId, classId, subjectId, target.getId())) {
			throw new AccessDeniedException("Teacher is not authorized to teach this class and subject in the academic session");
		}
		return target;
	}

	private void verifyTeacherCanManageHomework(Long orgId, HomeworkAssignment hw) {
		if (isSchoolAdminOrPrincipal()) {
			return;
		}
		Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
		if (ownTeacher.isEmpty()) {
			throw new AccessDeniedException("User is not an authorized teacher for this homework");
		}
		Long tId = ownTeacher.get().getId();
		if (!hw.getTeacherId().equals(tId)
				&& !isTeacherAuthorizedForClassSubject(
						orgId, hw.getAcademicSessionId(), hw.getClassId(), hw.getSubjectId(), tId)) {
			throw new AccessDeniedException("Teacher is not authorized for this homework assignment's class and subject");
		}
	}

	private TeacherProfile resolveTargetTeacherForDashboard(Long orgId, Long requestedTeacherId) {
		Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
		if (!isSchoolAdminOrPrincipal()) {
			if (ownTeacher.isEmpty()) {
				throw new AccessDeniedException("Current user is not linked to a teacher profile");
			}
			if (requestedTeacherId != null && !ownTeacher.get().getId().equals(requestedTeacherId)) {
				throw new AccessDeniedException("Teachers can only view their own homework dashboard");
			}
			return ownTeacher.get();
		}
		if (requestedTeacherId != null) {
			return teacherProfileRepository.findByIdAndOrganizationId(requestedTeacherId, orgId)
					.orElseThrow(() -> new EntityNotFoundException("Teacher profile not found"));
		}
		return ownTeacher.orElseThrow(
				() -> new IllegalArgumentException("teacherId is required when viewing teacher dashboard as administrator"));
	}
	private Student resolveAndAuthorizeTargetStudent(Long orgId, Long requestedStudentId) {
		boolean canViewAnyStudent = isSchoolAdminOrPrincipal()
				|| currentUser.hasPermission(PermissionCode.TEACHER_VIEW.getValue())
				|| currentUser.hasPermission(PermissionCode.STUDENT_VIEW.getValue());
		Optional<Student> ownStudent = currentUser.getUserId() == null ? Optional.empty()
				: studentRepository.findByOrganizationIdAndUserId(orgId, currentUser.getUserId());

		if (!canViewAnyStudent || ownStudent.isPresent()) {
			if (ownStudent.isEmpty()) {
				throw new AccessDeniedException("Current user is not linked to a student profile in this organization");
			}
			if (requestedStudentId != null && !ownStudent.get().getId().equals(requestedStudentId)) {
				throw new AccessDeniedException("Students cannot access or submit homework for another student");
			}
			return ownStudent.get();
		}
		if (requestedStudentId != null) {
			return studentRepository.findByIdAndOrganizationId(requestedStudentId, orgId)
					.orElseThrow(() -> new EntityNotFoundException("Student not found"));
		}
		throw new IllegalArgumentException("studentId is required");
	}

	private HomeworkAssignmentResponse toHomeworkResponse(
			Long orgId, HomeworkAssignment hw, AcademicSession session,
			SchoolClass sc, Subject subj, TeacherProfile teacher,
			List<StudentHomeworkSubmission> subs, LocalDate referenceDate) {
		int pending = 0, overdue = 0, submitted = 0, evaluated = 0;
		for (StudentHomeworkSubmission s : subs) {
			HomeworkSubmissionStatus eff = resolveEffectiveStatus(s, hw, referenceDate);
			switch (eff) {
				case PENDING -> pending++;
				case OVERDUE -> overdue++;
				case SUBMITTED -> submitted++;
				case EVALUATED -> evaluated++;
			}
		}
		return new HomeworkAssignmentResponse(
				hw.getId(), hw.getOrganizationId(),
				hw.getAcademicSessionId(), session != null ? session.getName() : null,
				hw.getClassId(), sc != null ? sc.getName() : null,
				hw.getSubjectId(), subj != null ? subj.getCode() : null, subj != null ? subj.getName() : null,
				hw.getTeacherId(), resolveTeacherName(orgId, teacher),
				hw.getTitle(), hw.getDescription(),
				hw.getAssignedDate(), hw.getDueDate(), hw.getMaxMarks(),
				hw.isAllowResubmission(), hw.getLateSubmissionPolicy(),
				deserializeAttachments(hw.getReferenceAttachments()),
				hw.getStatus(),
				subs.size(), pending, overdue, submitted, evaluated,
				hw.getCreatedAt(), hw.getUpdatedAt());
	}
	private List<StudentHomeworkSubmissionResponse> mapSubmissionResponses(
			Long orgId, Map<Long, HomeworkAssignment> hwMap,
			List<StudentHomeworkSubmission> subs, LocalDate referenceDate) {
		if (subs.isEmpty()) {
			return List.of();
		}
		Map<Long, SchoolClass> classMap = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Subject> subjMap = subjectRepository.findAllByOrganizationIdOrderByNameAsc(orgId).stream()
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
		Map<Long, TeacherProfile> teacherMap = teacherProfileRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(TeacherProfile::getId, Function.identity()));
		Set<Long> studentIds = subs.stream().map(StudentHomeworkSubmission::getStudentId).collect(Collectors.toSet());
		Map<Long, Student> studentMap = studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		List<StudentHomeworkSubmissionResponse> result = new ArrayList<>();
		for (StudentHomeworkSubmission s : subs) {
			HomeworkAssignment hw = hwMap.get(s.getHomeworkId());
			if (hw == null) {
				continue;
			}
			SchoolClass sc = classMap.get(hw.getClassId());
			Subject subj = subjMap.get(hw.getSubjectId());
			TeacherProfile teacher = teacherMap.get(hw.getTeacherId());
			Student st = studentMap.get(s.getStudentId());
			HomeworkSubmissionStatus effStatus = resolveEffectiveStatus(s, hw, referenceDate);

			result.add(new StudentHomeworkSubmissionResponse(
					s.getId(), s.getOrganizationId(), s.getAcademicSessionId(),
					hw.getId(), hw.getTitle(), hw.getDescription(),
					hw.getClassId(), sc != null ? sc.getName() : null,
					hw.getSubjectId(), subj != null ? subj.getName() : null,
					hw.getTeacherId(), resolveTeacherName(orgId, teacher),
					hw.getAssignedDate(), hw.getDueDate(), hw.getMaxMarks(),
					hw.isAllowResubmission(), hw.getLateSubmissionPolicy(),
					deserializeAttachments(hw.getReferenceAttachments()),
					s.getEnrollmentId(), s.getStudentId(),
					st != null ? st.getAdmissionNumber() : null, fullName(st),
					effStatus,
					s.getSubmissionText(),
					deserializeAttachments(s.getSubmissionAttachments()),
					s.getSubmissionDate(), s.getSubmittedAt(), s.getLastResubmittedAt(),
					s.getSubmissionCount(), s.isLateSubmission(),
					s.getMarksAwarded(), s.getTeacherFeedback(),
					s.getEvaluatedBy(), s.getEvaluatedAt()));
		}
		return result;
	}

	private HomeworkSubmissionStatus resolveEffectiveStatus(
			StudentHomeworkSubmission s, HomeworkAssignment hw, LocalDate referenceDate) {
		if (s.getStatus() == HomeworkSubmissionStatus.PENDING
				&& hw != null && hw.getDueDate() != null
				&& referenceDate != null && referenceDate.isAfter(hw.getDueDate())) {
			return HomeworkSubmissionStatus.OVERDUE;
		}
		return s.getStatus();
	}

	private String resolveTeacherName(Long orgId, TeacherProfile teacher) {
		if (teacher == null) {
			return "";
		}
		return staffRepository.findByIdAndOrganizationId(teacher.getStaffId(), orgId)
				.map(st -> st.getFirstName() + (st.getLastName() != null ? " " + st.getLastName() : ""))
				.orElse("");
	}

	private String fullName(Student s) {
		if (s == null) {
			return "";
		}
		return s.getFirstName() + (s.getLastName() != null ? " " + s.getLastName() : "");
	}

	private String serializeAttachments(List<String> attachments) {
		if (attachments == null || attachments.isEmpty()) {
			return null;
		}
		List<String> cleaned = attachments.stream()
				.filter(a -> a != null && !a.isBlank())
				.map(String::trim)
				.toList();
		return cleaned.isEmpty() ? null : String.join("\n", cleaned);
	}

	private List<String> deserializeAttachments(String raw) {
		if (raw == null || raw.isBlank()) {
			return List.of();
		}
		return Arrays.stream(raw.split("\\R"))
				.map(String::trim)
				.filter(s -> !s.isBlank())
				.toList();
	}
}
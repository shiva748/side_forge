package com.side.forge.organization.examination.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.classsubject.repository.ClassSubjectRepository;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.repository.SubjectRepository;
import com.side.forge.organization.academic.subject.service.SubjectService;
import com.side.forge.organization.examination.dto.*;
import com.side.forge.organization.examination.dto.CreateGradingScaleRequest.*;
import com.side.forge.organization.examination.dto.EnterMarkRequest.*;
import com.side.forge.organization.examination.dto.ExaminationResponse.*;
import com.side.forge.organization.examination.dto.ScheduleExamSubjectRequest.ExamScheduleResponse;
import com.side.forge.organization.examination.entity.*;
import com.side.forge.organization.examination.repository.*;
import com.side.forge.organization.parentportal.security.ParentChildAccessValidator;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.mapper.StudentMapper;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;
import com.side.forge.organization.teacher.service.TeacherService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExaminationService {

	public static final String RESOURCE_EXAMINATION_DOCUMENT = "EXAMINATION_DOCUMENT";

	private final GradingScaleRepository gradingScaleRepository;
	private final GradingRuleRepository gradingRuleRepository;
	private final ExaminationRepository examinationRepository;
	private final ExamScheduleRepository scheduleRepository;
	private final ExamMarkRepository markRepository;
	private final StudentExamResultRepository resultRepository;
	private final AcademicSessionService sessionService;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final SubjectService subjectService;
	private final SubjectRepository subjectRepository;
	private final ClassSubjectRepository classSubjectRepository;
	private final StudentService studentService;
	private final StudentRepository studentRepository;
	private final StudentMapper studentMapper;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final TeacherService teacherService;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final NotificationService notificationService;
	private final ParentChildAccessValidator parentChildValidator;
	private final com.side.forge.storage.service.FileManagementService fileManagementService;

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@Transactional
	public GradingScaleResponse createGradingScale(Long orgId, CreateGradingScaleRequest request) {
		validator.requireOrganization(orgId);
		String name = validator.normalizeRequiredText(request.name(), "Grading scale name");
		if (gradingScaleRepository.existsByOrganizationIdAndNameIgnoreCase(orgId, name)) {
			throw new IllegalStateException("Grading scale with this name already exists in the organization");
		}

		List<RuleItem> items = request.rules() == null ? List.of() : request.rules();
		validateGradingRules(items);

		GradingScale scale = new GradingScale();
		scale.setOrganizationId(orgId);
		scale.setName(name);
		scale.setDescription(validator.normalizeOptionalText(request.description()));
		scale.setActive(true);
		scale = gradingScaleRepository.save(scale);

		List<GradingRule> savedRules = new ArrayList<>();
		for (RuleItem item : items) {
			GradingRule rule = new GradingRule();
			rule.setOrganizationId(orgId);
			rule.setGradingScaleId(scale.getId());
			rule.setGrade(validator.normalizeCode(item.grade(), "Grade"));
			rule.setMinPercentage(item.minPercentage());
			rule.setMaxPercentage(item.maxPercentage());
			rule.setGradePoint(item.gradePoint());
			rule.setPassing(item.passing() == null || item.passing());
			rule.setRemarks(validator.normalizeOptionalText(item.remarks()));
			savedRules.add(gradingRuleRepository.save(rule));
		}

		return toGradingScaleResponse(scale, savedRules);
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public List<GradingScaleResponse> getGradingScales(Long orgId) {
		validator.requireOrganization(orgId);
		return gradingScaleRepository.findAllByOrganizationIdOrderByNameAsc(orgId).stream()
				.map(s -> toGradingScaleResponse(s,
						gradingRuleRepository.findAllByOrganizationIdAndGradingScaleIdOrderByMaxPercentageDesc(
								orgId, s.getId())))
				.toList();
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@Transactional
	public ExaminationResponse createExamination(Long orgId, CreateExaminationRequest request) {
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, request.classId());
		GradingScale scale = requireGradingScale(orgId, request.gradingScaleId());
		if (!scale.isActive()) {
			throw new IllegalStateException("Cannot create an examination using an inactive grading scale");
		}

		String name = validator.normalizeRequiredText(request.name(), "Examination name");
		if (request.startDate() == null || request.endDate() == null
				|| request.endDate().isBefore(request.startDate())) {
			throw new IllegalArgumentException("Examination end date cannot be earlier than start date");
		}
		if (examinationRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndNameIgnoreCase(
				orgId, session.getId(), schoolClass.getId(), name)) {
			throw new IllegalStateException("Examination with this name already exists for the class in this session");
		}

		Examination exam = new Examination();
		exam.setOrganizationId(orgId);
		exam.setAcademicSessionId(session.getId());
		exam.setClassId(schoolClass.getId());
		exam.setGradingScaleId(scale.getId());
		exam.setName(name);
		exam.setExamType(request.examType());
		exam.setStartDate(request.startDate());
		exam.setEndDate(request.endDate());
		exam.setStatus(ExaminationStatus.DRAFT);
		exam.setInstructions(validator.normalizeOptionalText(request.instructions()));

		Examination saved = examinationRepository.save(exam);
		return toExaminationResponse(saved, session, schoolClass, scale, List.of());
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public List<ExaminationResponse> getSessionExaminations(Long orgId, Long sessionId, Long classId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		List<Examination> exams;
		if (classId != null) {
			classService.requireClass(orgId, classId);
			exams = examinationRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByStartDateAscIdAsc(
					orgId, sessionId, classId);
		} else {
			exams = examinationRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(
					orgId, sessionId);
		}
		return exams.stream().map(e -> buildFullExaminationResponse(orgId, e, session)).toList();
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public ExaminationResponse getExaminationById(Long orgId, Long examinationId) {
		validator.requireOrganization(orgId);
		Examination exam = requireExamination(orgId, examinationId);
		AcademicSession session = sessionService.requireSession(orgId, exam.getAcademicSessionId());
		return buildFullExaminationResponse(orgId, exam, session);
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@Transactional
	public ExamScheduleResponse scheduleSubject(
			Long orgId, Long examinationId, ScheduleExamSubjectRequest request) {
		validator.requireOrganization(orgId);
		Examination exam = requireExaminationForUpdate(orgId, examinationId);
		requireModifiableSession(orgId, exam.getAcademicSessionId());

		if (!exam.getStatus().isEditableConfig()) {
			throw new IllegalStateException("Cannot modify examination schedule in status " + exam.getStatus());
		}

		validateScheduleTimingsAndMarks(exam, request);
		Subject subject = subjectService.requireSubject(orgId, request.subjectId());
		if (!subject.isActive()) {
			throw new IllegalStateException("Cannot schedule an inactive subject for examination");
		}
		if (!classSubjectRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
				orgId, exam.getAcademicSessionId(), exam.getClassId(), subject.getId())) {
			throw new IllegalStateException("Subject is not assigned to this class in the academic session");
		}
		if (scheduleRepository.existsByOrganizationIdAndExaminationIdAndSubjectId(
				orgId, exam.getId(), subject.getId())) {
			throw new IllegalStateException("Subject is already scheduled in this examination");
		}

		if (request.invigilatorTeacherId() != null) {
			teacherService.requireActiveAssignableTeacherForUpdate(orgId, request.invigilatorTeacherId());
			checkInvigilatorOverlap(orgId, exam.getAcademicSessionId(), request.invigilatorTeacherId(),
					request.examDate(), request.startTime(), request.endTime());
		}

		checkClassExamOverlap(orgId, exam.getAcademicSessionId(), exam.getClassId(),
				request.examDate(), request.startTime(), request.endTime());

		ExamSchedule schedule = new ExamSchedule();
		schedule.setOrganizationId(orgId);
		schedule.setAcademicSessionId(exam.getAcademicSessionId());
		schedule.setExaminationId(exam.getId());
		schedule.setClassId(exam.getClassId());
		schedule.setSubjectId(subject.getId());
		schedule.setExamDate(request.examDate());
		schedule.setStartTime(request.startTime());
		schedule.setEndTime(request.endTime());
		schedule.setMaxMarks(request.maxMarks());
		schedule.setPassingMarks(request.passingMarks());
		schedule.setInvigilatorTeacherId(request.invigilatorTeacherId());
		schedule.setRoom(validator.normalizeOptionalText(request.room()));

		if (exam.getStatus() == ExaminationStatus.DRAFT) {
			exam.setStatus(ExaminationStatus.SCHEDULED);
			examinationRepository.save(exam);
		}

		ExamSchedule saved = scheduleRepository.saveAndFlush(schedule);
		notificationService.notifyExamSchedulePublished(exam, saved, subject.getName());
		return toScheduleResponse(saved, subject);
	}

	@RequirePermission(PermissionCode.EXAM_ENTER_MARKS)
	@Transactional
	public ExamMarkResponse enterOrUpdateMark(Long orgId, Long examinationId, EnterMarkRequest request) {
		validator.requireOrganization(orgId);
		Examination exam = requireExaminationForUpdate(orgId, examinationId);
		requireModifiableSession(orgId, exam.getAcademicSessionId());

		if (!exam.getStatus().allowsMarksEntry()) {
			throw new IllegalStateException("Marks entry is not permitted when examination is in status " + exam.getStatus());
		}

		ExamSchedule schedule = scheduleRepository
				.findByOrganizationIdAndExaminationIdAndSubjectId(orgId, exam.getId(), request.subjectId())
				.orElseThrow(() -> new EntityNotFoundException("Subject is not scheduled in this examination"));

		Subject subject = subjectService.requireSubject(orgId, schedule.getSubjectId());
		Student student = studentService.requireStudentForUpdate(orgId, request.studentId());
		StudentEnrollment enrollment = requireActiveEnrollment(
				orgId, exam.getAcademicSessionId(), exam.getClassId(), student.getId());

		List<GradingRule> rules = gradingRuleRepository
				.findAllByOrganizationIdAndGradingScaleIdOrderByMaxPercentageDesc(orgId, exam.getGradingScaleId());

		ExamMark mark = saveStudentMarkInternal(
				orgId, exam, schedule, enrollment, student, rules,
				request.entryStatus(), request.marksObtained(), request.remarks());

		if (exam.getStatus() == ExaminationStatus.SCHEDULED) {
			exam.setStatus(ExaminationStatus.IN_PROGRESS);
			examinationRepository.save(exam);
		}

		return toMarkResponse(mark, schedule, subject, student);
	}

	@RequirePermission(PermissionCode.EXAM_ENTER_MARKS)
	@Transactional
	public List<ExamMarkResponse> enterBulkMarks(Long orgId, Long examinationId, BulkMarkEntryRequest request) {
		validator.requireOrganization(orgId);
		Examination exam = requireExaminationForUpdate(orgId, examinationId);
		requireModifiableSession(orgId, exam.getAcademicSessionId());

		if (!exam.getStatus().allowsMarksEntry()) {
			throw new IllegalStateException("Marks entry is not permitted when examination is in status " + exam.getStatus());
		}

		ExamSchedule schedule = scheduleRepository
				.findByOrganizationIdAndExaminationIdAndSubjectId(orgId, exam.getId(), request.subjectId())
				.orElseThrow(() -> new EntityNotFoundException("Subject is not scheduled in this examination"));
		Subject subject = subjectService.requireSubject(orgId, schedule.getSubjectId());

		List<GradingRule> rules = gradingRuleRepository
				.findAllByOrganizationIdAndGradingScaleIdOrderByMaxPercentageDesc(orgId, exam.getGradingScaleId());

		Set<Long> seenStudents = new HashSet<>();
		List<ExamMarkResponse> responses = new ArrayList<>();

		for (StudentMarkItem item : request.entries()) {
			if (!seenStudents.add(item.studentId())) {
				throw new IllegalArgumentException("Duplicate student ID in bulk marks request: " + item.studentId());
			}
			Student student = studentService.requireStudentForUpdate(orgId, item.studentId());
			StudentEnrollment enrollment = requireActiveEnrollment(
					orgId, exam.getAcademicSessionId(), exam.getClassId(), student.getId());

			ExamMark saved = saveStudentMarkInternal(
					orgId, exam, schedule, enrollment, student, rules,
					item.entryStatus(), item.marksObtained(), item.remarks());
			responses.add(toMarkResponse(saved, schedule, subject, student));
		}

		if (exam.getStatus() == ExaminationStatus.SCHEDULED) {
			exam.setStatus(ExaminationStatus.IN_PROGRESS);
			examinationRepository.save(exam);
		}

		return responses;
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public List<ExamMarkResponse> getExaminationMarks(Long orgId, Long examinationId, Long subjectId, Long studentId) {
		validator.requireOrganization(orgId);
		Examination exam = requireExamination(orgId, examinationId);
		List<ExamMark> marks;
		if (subjectId != null) {
			subjectService.requireSubject(orgId, subjectId);
			marks = markRepository.findAllByOrganizationIdAndExaminationIdAndSubjectIdOrderByStudentIdAsc(
					orgId, exam.getId(), subjectId);
		} else if (studentId != null) {
			studentService.requireStudent(orgId, studentId);
			marks = markRepository.findAllByOrganizationIdAndExaminationIdAndStudentIdOrderBySubjectIdAsc(
					orgId, exam.getId(), studentId);
		} else {
			marks = markRepository.findAllByOrganizationIdAndExaminationIdOrderBySubjectIdAscStudentIdAsc(
					orgId, exam.getId());
		}
		return mapMarks(orgId, exam.getId(), marks);
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public List<StudentResponse> getMissingMarksStudents(Long orgId, Long examinationId, Long subjectId) {
		validator.requireOrganization(orgId);
		Examination exam = requireExamination(orgId, examinationId);
		scheduleRepository.findByOrganizationIdAndExaminationIdAndSubjectId(orgId, exam.getId(), subjectId)
				.orElseThrow(() -> new EntityNotFoundException("Subject is not scheduled in this examination"));

		List<StudentEnrollment> activeEnrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(
						orgId, exam.getAcademicSessionId(), exam.getClassId())
				.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).toList();

		Set<Long> enteredStudentIds = markRepository
				.findAllByOrganizationIdAndExaminationIdAndSubjectIdOrderByStudentIdAsc(orgId, exam.getId(), subjectId)
				.stream().map(ExamMark::getStudentId).collect(Collectors.toSet());

		Set<Long> missingStudentIds = activeEnrollments.stream()
				.map(StudentEnrollment::getStudentId)
				.filter(sId -> !enteredStudentIds.contains(sId))
				.collect(Collectors.toSet());
		if (missingStudentIds.isEmpty()) {
			return List.of();
		}
		return studentRepository.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, missingStudentIds)
				.stream().map(studentMapper::toResponse).toList();
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@Transactional
	public ExaminationResponse finalizeExaminationResults(Long orgId, Long examinationId) {
		validator.requireOrganization(orgId);
		Examination exam = requireExaminationForUpdate(orgId, examinationId);
		AcademicSession session = requireModifiableSession(orgId, exam.getAcademicSessionId());

		if (exam.getStatus() == ExaminationStatus.COMPLETED || exam.getStatus() == ExaminationStatus.PUBLISHED) {
			throw new IllegalStateException("Examination results are already finalized or published");
		}
		if (exam.getStatus() == ExaminationStatus.DRAFT) {
			throw new IllegalStateException("Cannot finalize an unscheduled draft examination");
		}

		List<ExamSchedule> schedules = scheduleRepository
				.findAllByOrganizationIdAndExaminationIdOrderByExamDateAscStartTimeAsc(orgId, exam.getId());
		if (schedules.isEmpty()) {
			throw new IllegalStateException("Cannot finalize examination without scheduled subjects");
		}

		List<StudentEnrollment> activeEnrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(
						orgId, exam.getAcademicSessionId(), exam.getClassId())
				.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).toList();
		if (activeEnrollments.isEmpty()) {
			throw new IllegalStateException("Cannot finalize examination with no active enrolled students in the class");
		}

		calculateAndSaveAllStudentResults(orgId, exam, schedules, activeEnrollments);

		exam.setStatus(ExaminationStatus.COMPLETED);
		exam.setFinalizedAt(Instant.now());
		Examination saved = examinationRepository.save(exam);
		return buildFullExaminationResponse(orgId, saved, session);
	}

	@RequirePermission(PermissionCode.EXAM_PUBLISH_RESULTS)
	@Transactional
	public ExaminationResponse publishExaminationResults(Long orgId, Long examinationId) {
		validator.requireOrganization(orgId);
		Examination exam = requireExaminationForUpdate(orgId, examinationId);
		AcademicSession session = requireModifiableSession(orgId, exam.getAcademicSessionId());

		if (exam.getStatus() == ExaminationStatus.PUBLISHED) {
			throw new IllegalStateException("Examination results are already published");
		}
		if (exam.getStatus() != ExaminationStatus.COMPLETED) {
			throw new IllegalStateException("Examination results must be finalized (COMPLETED) before publishing");
		}

		exam.setStatus(ExaminationStatus.PUBLISHED);
		exam.setPublishedAt(Instant.now());
		exam.setPublishedBy(currentUser.getUserId());
		Examination saved = examinationRepository.save(exam);
		SchoolClass sc = classService.requireClass(orgId, saved.getClassId());
		notificationService.notifyExamResultsPublished(saved, sc.getName());
		return buildFullExaminationResponse(orgId, saved, session);
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public ReportCardResponse getStudentReportCard(Long orgId, Long examinationId, Long studentId) {
		validator.requireOrganization(orgId);
		parentChildValidator.verifyStudentAccessForCurrentUser(orgId, studentId);
		Examination exam = requireExamination(orgId, examinationId);
		if (exam.getStatus() != ExaminationStatus.PUBLISHED
				&& !currentUser.hasPermission(PermissionCode.EXAM_MANAGE.getValue())
				&& !currentUser.hasPermission(PermissionCode.EXAM_PUBLISH_RESULTS.getValue())) {
			throw new IllegalStateException("Examination results have not been published yet");
		}

		Student student = studentService.requireStudent(orgId, studentId);
		StudentExamResult result = resultRepository
				.findByOrganizationIdAndExaminationIdAndStudentId(orgId, exam.getId(), student.getId())
				.orElseThrow(() -> new EntityNotFoundException("Examination result not found for this student"));

		AcademicSession session = sessionService.requireSession(orgId, exam.getAcademicSessionId());
		SchoolClass sc = classService.requireClass(orgId, exam.getClassId());
		List<ExamMark> marks = markRepository
				.findAllByOrganizationIdAndExaminationIdAndStudentIdOrderBySubjectIdAsc(orgId, exam.getId(), student.getId());

		String fullName = student.getFirstName() + (student.getLastName() != null ? " " + student.getLastName() : "");
		return new ReportCardResponse(
				exam.getId(), exam.getName(), exam.getExamType(), exam.getStatus(),
				session.getId(), session.getName(), sc.getId(), sc.getName(),
				student.getId(), student.getAdmissionNumber(), fullName,
				result.getTotalObtainedMarks(), result.getTotalMaxMarks(),
				result.getPercentage(), result.getOverallGrade(), result.isOverallPassed(),
				mapMarks(orgId, exam.getId(), marks)
		);
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public ClassExamReportResponse getClassExamReport(Long orgId, Long examinationId) {
		validator.requireOrganization(orgId);
		Examination exam = requireExamination(orgId, examinationId);
		if (exam.getStatus() != ExaminationStatus.PUBLISHED
				&& exam.getStatus() != ExaminationStatus.COMPLETED) {
			throw new IllegalStateException("Examination results must be finalized or published before viewing class report");
		}
		if (exam.getStatus() != ExaminationStatus.PUBLISHED
				&& !currentUser.hasPermission(PermissionCode.EXAM_MANAGE.getValue())
				&& !currentUser.hasPermission(PermissionCode.EXAM_PUBLISH_RESULTS.getValue())) {
			throw new IllegalStateException("Examination results have not been published yet");
		}

		AcademicSession session = sessionService.requireSession(orgId, exam.getAcademicSessionId());
		SchoolClass sc = classService.requireClass(orgId, exam.getClassId());
		List<StudentExamResult> results = resultRepository
				.findAllByOrganizationIdAndExaminationIdOrderByPercentageDescStudentIdAsc(orgId, exam.getId());

		Set<Long> studentIds = results.stream().map(StudentExamResult::getStudentId).collect(Collectors.toSet());
		Map<Long, Student> studentMap = studentIds.isEmpty() ? Map.of() : studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds)
				.stream().collect(Collectors.toMap(Student::getId, Function.identity()));

		List<ExamMark> allMarks = markRepository
				.findAllByOrganizationIdAndExaminationIdOrderBySubjectIdAscStudentIdAsc(orgId, exam.getId());
		Map<Long, List<ExamMarkResponse>> marksByStudent = mapMarks(orgId, exam.getId(), allMarks).stream()
				.collect(Collectors.groupingBy(ExamMarkResponse::studentId));

		int passedCount = 0;
		Map<String, Integer> gradeDist = new LinkedHashMap<>();
		List<ReportCardResponse> cards = new ArrayList<>();

		for (StudentExamResult r : results) {
			if (r.isOverallPassed()) {
				passedCount++;
			}
			gradeDist.merge(r.getOverallGrade(), 1, Integer::sum);
			Student st = studentMap.get(r.getStudentId());
			String fullName = st == null ? "" : (st.getFirstName() + (st.getLastName() != null ? " " + st.getLastName() : ""));
			cards.add(new ReportCardResponse(
					exam.getId(), exam.getName(), exam.getExamType(), exam.getStatus(),
					session.getId(), session.getName(), sc.getId(), sc.getName(),
					r.getStudentId(), st != null ? st.getAdmissionNumber() : null, fullName,
					r.getTotalObtainedMarks(), r.getTotalMaxMarks(), r.getPercentage(),
					r.getOverallGrade(), r.isOverallPassed(),
					marksByStudent.getOrDefault(r.getStudentId(), List.of())
			));
		}

		int total = results.size();
		int failedCount = total - passedCount;
		double passPct = total == 0 ? 0.0 : BigDecimal.valueOf((passedCount * 100.0) / total)
				.setScale(2, RoundingMode.HALF_UP).doubleValue();

		return new ClassExamReportResponse(
				exam.getId(), exam.getName(), exam.getStatus(),
				session.getId(), sc.getId(), sc.getName(),
				total, passedCount, failedCount, passPct, gradeDist, cards);
	}

	private void calculateAndSaveAllStudentResults(
			Long orgId, Examination exam, List<ExamSchedule> schedules,
			List<StudentEnrollment> activeEnrollments) {
		List<ExamMark> allMarks = markRepository
				.findAllByOrganizationIdAndExaminationIdOrderBySubjectIdAscStudentIdAsc(orgId, exam.getId());
		Map<Long, Map<Long, ExamMark>> marksByStudentAndSubject = new HashMap<>();
		for (ExamMark m : allMarks) {
			marksByStudentAndSubject.computeIfAbsent(m.getStudentId(), k -> new HashMap<>()).put(m.getSubjectId(), m);
		}

		List<GradingRule> rules = gradingRuleRepository
				.findAllByOrganizationIdAndGradingScaleIdOrderByMaxPercentageDesc(orgId, exam.getGradingScaleId());

		for (StudentEnrollment enrollment : activeEnrollments) {
			Map<Long, ExamMark> studentMarks = marksByStudentAndSubject.getOrDefault(enrollment.getStudentId(), Map.of());
			for (ExamSchedule schedule : schedules) {
				if (!studentMarks.containsKey(schedule.getSubjectId())) {
					throw new IllegalStateException(
							"Cannot finalize examination: marks are missing for one or more enrolled students");
				}
			}
		}

		for (StudentEnrollment enrollment : activeEnrollments) {
			Map<Long, ExamMark> studentMarks = marksByStudentAndSubject.get(enrollment.getStudentId());
			BigDecimal totalObtained = BigDecimal.ZERO;
			BigDecimal totalMax = BigDecimal.ZERO;
			boolean allSubjectsPassed = true;

			for (ExamSchedule schedule : schedules) {
				ExamMark m = studentMarks.get(schedule.getSubjectId());
				if (m.getEntryStatus() == MarkEntryStatus.EXEMPTED) {
					continue;
				}
				totalMax = totalMax.add(schedule.getMaxMarks());
				if (m.getEntryStatus() == MarkEntryStatus.PRESENT && m.getMarksObtained() != null) {
					totalObtained = totalObtained.add(m.getMarksObtained());
				}
				if (!m.isPassed()) {
					allSubjectsPassed = false;
				}
			}

			BigDecimal pct = totalMax.compareTo(BigDecimal.ZERO) == 0
					? BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP)
					: totalObtained.multiply(BigDecimal.valueOf(100))
							.divide(totalMax, 2, RoundingMode.HALF_UP);
			GradingRule matchedRule = resolveGrade(rules, pct);
			String overallGrade = matchedRule != null ? matchedRule.getGrade() : (allSubjectsPassed ? "PASS" : "FAIL");
			boolean overallPassed = allSubjectsPassed && (matchedRule == null || matchedRule.isPassing());

			StudentExamResult result = resultRepository
					.findByOrganizationIdAndExaminationIdAndStudentId(orgId, exam.getId(), enrollment.getStudentId())
					.orElseGet(StudentExamResult::new);
			result.setOrganizationId(orgId);
			result.setAcademicSessionId(exam.getAcademicSessionId());
			result.setExaminationId(exam.getId());
			result.setClassId(exam.getClassId());
			result.setEnrollmentId(enrollment.getId());
			result.setStudentId(enrollment.getStudentId());
			result.setTotalObtainedMarks(totalObtained.setScale(2, RoundingMode.HALF_UP));
			result.setTotalMaxMarks(totalMax.setScale(2, RoundingMode.HALF_UP));
			result.setPercentage(pct);
			result.setOverallGrade(overallGrade);
			result.setOverallPassed(overallPassed);
			resultRepository.save(result);
		}
	}

	private ExamMark saveStudentMarkInternal(
			Long orgId, Examination exam, ExamSchedule schedule, StudentEnrollment enrollment,
			Student student, List<GradingRule> rules,
			MarkEntryStatus status, BigDecimal marksObtained, String remarks) {
		BigDecimal effectiveMarks = null;
		boolean passed;
		String grade;

		if (status == MarkEntryStatus.PRESENT) {
			if (marksObtained == null) {
				throw new IllegalArgumentException("Marks obtained is required when student is PRESENT");
			}
			if (marksObtained.compareTo(BigDecimal.ZERO) < 0) {
				throw new IllegalArgumentException("Marks obtained cannot be negative");
			}
			if (marksObtained.compareTo(schedule.getMaxMarks()) > 0) {
				throw new IllegalArgumentException("Marks obtained cannot exceed maximum marks (" + schedule.getMaxMarks() + ")");
			}
			effectiveMarks = marksObtained.setScale(2, RoundingMode.HALF_UP);
			passed = effectiveMarks.compareTo(schedule.getPassingMarks()) >= 0;
			BigDecimal pct = effectiveMarks.multiply(BigDecimal.valueOf(100))
					.divide(schedule.getMaxMarks(), 2, RoundingMode.HALF_UP);
			GradingRule rule = resolveGrade(rules, pct);
			grade = rule != null ? rule.getGrade() : (passed ? "PASS" : "FAIL");
		} else if (status == MarkEntryStatus.ABSENT) {
			if (marksObtained != null) {
				throw new IllegalArgumentException("Marks obtained must not be supplied when student is marked ABSENT");
			}
			passed = false;
			grade = "AB";
		} else {
			if (marksObtained != null) {
				throw new IllegalArgumentException("Marks obtained must not be supplied when student is marked EXEMPTED");
			}
			passed = true;
			grade = "EX";
		}

		Optional<ExamMark> existingOpt = markRepository
				.findByOrganizationIdAndExaminationIdAndSubjectIdAndStudentId(
						orgId, exam.getId(), schedule.getSubjectId(), student.getId());
		ExamMark mark;
		if (existingOpt.isPresent()) {
			mark = existingOpt.get();
			mark.setUpdatedBy(currentUser.getUserId());
		} else {
			mark = new ExamMark();
			mark.setOrganizationId(orgId);
			mark.setAcademicSessionId(exam.getAcademicSessionId());
			mark.setExaminationId(exam.getId());
			mark.setExamScheduleId(schedule.getId());
			mark.setClassId(exam.getClassId());
			mark.setSubjectId(schedule.getSubjectId());
			mark.setEnrollmentId(enrollment.getId());
			mark.setStudentId(student.getId());
			mark.setEnteredBy(currentUser.getUserId());
		}

		mark.setEntryStatus(status);
		mark.setMarksObtained(effectiveMarks);
		mark.setGrade(grade);
		mark.setPassed(passed);
		mark.setRemarks(validator.normalizeOptionalText(remarks));
		return markRepository.saveAndFlush(mark);
	}

	private void validateGradingRules(List<RuleItem> items) {
		Set<String> grades = new HashSet<>();
		for (int i = 0; i < items.size(); i++) {
			RuleItem a = items.get(i);
			String code = validator.normalizeCode(a.grade(), "Grade");
			if (!grades.add(code)) {
				throw new IllegalStateException("Duplicate grade code in grading scale: " + code);
			}
			if (a.minPercentage().compareTo(a.maxPercentage()) > 0) {
				throw new IllegalArgumentException(
						"Minimum percentage cannot exceed maximum percentage for grade " + code);
			}
			for (int j = i + 1; j < items.size(); j++) {
				RuleItem b = items.get(j);
				if (a.minPercentage().compareTo(b.maxPercentage()) <= 0
						&& b.minPercentage().compareTo(a.maxPercentage()) <= 0) {
					throw new IllegalStateException(
							"Overlapping percentage ranges between grades " + a.grade() + " and " + b.grade());
				}
			}
		}
	}

	private void validateScheduleTimingsAndMarks(Examination exam, ScheduleExamSubjectRequest req) {
		if (req.examDate().isBefore(exam.getStartDate()) || req.examDate().isAfter(exam.getEndDate())) {
			throw new IllegalArgumentException("Subject exam date must fall within examination start and end dates");
		}
		if (!req.startTime().isBefore(req.endTime())) {
			throw new IllegalArgumentException("Exam start time must be earlier than end time");
		}
		if (req.passingMarks().compareTo(req.maxMarks()) > 0) {
			throw new IllegalArgumentException("Passing marks cannot exceed maximum marks");
		}
	}

	private void checkClassExamOverlap(
			Long orgId, Long sessionId, Long classId,
			java.time.LocalDate examDate, LocalTime start, LocalTime end) {
		List<ExamSchedule> existing = scheduleRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndExamDate(orgId, sessionId, classId, examDate);
		for (ExamSchedule s : existing) {
			if (s.getStartTime().isBefore(end) && start.isBefore(s.getEndTime())) {
				throw new IllegalStateException("Class already has an overlapping examination scheduled on " + examDate);
			}
		}
	}

	private void checkInvigilatorOverlap(
			Long orgId, Long sessionId, Long teacherId,
			java.time.LocalDate examDate, LocalTime start, LocalTime end) {
		List<ExamSchedule> existing = scheduleRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndInvigilatorTeacherIdAndExamDate(
						orgId, sessionId, teacherId, examDate);
		for (ExamSchedule s : existing) {
			if (s.getStartTime().isBefore(end) && start.isBefore(s.getEndTime())) {
				throw new IllegalStateException("Invigilator teacher already has an overlapping exam on " + examDate);
			}
		}
	}

	private GradingRule resolveGrade(List<GradingRule> rules, BigDecimal pct) {
		for (GradingRule r : rules) {
			if (pct.compareTo(r.getMinPercentage()) >= 0 && pct.compareTo(r.getMaxPercentage()) <= 0) {
				return r;
			}
		}
		return null;
	}

	private GradingScale requireGradingScale(Long orgId, Long scaleId) {
		return gradingScaleRepository.findByIdAndOrganizationId(scaleId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Grading scale not found"));
	}

	private Examination requireExamination(Long orgId, Long examId) {
		return examinationRepository.findByIdAndOrganizationId(examId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Examination not found"));
	}

	private Examination requireExaminationForUpdate(Long orgId, Long examId) {
		return examinationRepository.findByIdAndOrganizationIdForUpdate(examId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Examination not found"));
	}

	private AcademicSession requireModifiableSession(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot modify examinations of a completed academic session");
		}
		return session;
	}

	private SchoolClass requireActiveClassForUpdate(Long orgId, Long classId) {
		SchoolClass sc = classRepository.findByIdAndOrganizationIdForUpdate(classId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));
		if (!sc.isActive()) {
			throw new IllegalStateException("Cannot create examination for an inactive class");
		}
		return sc;
	}

	private StudentEnrollment requireActiveEnrollment(Long orgId, Long sessionId, Long classId, Long studentId) {
		StudentEnrollment enrollment = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, sessionId, studentId)
				.orElseThrow(() -> new IllegalStateException("Student is not enrolled in this academic session"));
		if (!enrollment.getClassId().equals(classId) || enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
			throw new IllegalStateException("Student does not have an active enrollment in the examination class");
		}
		return enrollment;
	}

	private ExaminationResponse buildFullExaminationResponse(Long orgId, Examination exam, AcademicSession session) {
		SchoolClass sc = classService.requireClass(orgId, exam.getClassId());
		GradingScale scale = requireGradingScale(orgId, exam.getGradingScaleId());
		List<ExamSchedule> schedules = scheduleRepository
				.findAllByOrganizationIdAndExaminationIdOrderByExamDateAscStartTimeAsc(orgId, exam.getId());
		Map<Long, Subject> subjectMap = schedules.isEmpty() ? Map.of() : subjectRepository.findAllById(
				schedules.stream().map(ExamSchedule::getSubjectId).collect(Collectors.toSet())).stream()
				.filter(s -> orgId.equals(s.getOrganizationId()))
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
		List<ExamScheduleResponse> scheduleDtos = schedules.stream()
				.map(s -> toScheduleResponse(s, subjectMap.get(s.getSubjectId())))
				.toList();
		return toExaminationResponse(exam, session, sc, scale, scheduleDtos);
	}

	private List<ExamMarkResponse> mapMarks(Long orgId, Long examId, List<ExamMark> marks) {
		if (marks.isEmpty()) {
			return List.of();
		}
		Map<Long, ExamSchedule> scheduleMap = scheduleRepository
				.findAllByOrganizationIdAndExaminationIdOrderByExamDateAscStartTimeAsc(orgId, examId).stream()
				.collect(Collectors.toMap(ExamSchedule::getId, Function.identity()));
		Map<Long, Subject> subjectMap = subjectRepository.findAllById(
				marks.stream().map(ExamMark::getSubjectId).collect(Collectors.toSet())).stream()
				.filter(s -> orgId.equals(s.getOrganizationId()))
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(
				orgId, marks.stream().map(ExamMark::getStudentId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));
		return marks.stream()
				.map(m -> toMarkResponse(
						m, scheduleMap.get(m.getExamScheduleId()),
						subjectMap.get(m.getSubjectId()), studentMap.get(m.getStudentId())))
				.toList();
	}

	private GradingScaleResponse toGradingScaleResponse(GradingScale s, List<GradingRule> rules) {
		List<GradingRuleResponse> ruleDtos = rules.stream()
				.map(r -> new GradingRuleResponse(
						r.getId(), r.getGrade(), r.getMinPercentage(), r.getMaxPercentage(),
						r.getGradePoint(), r.isPassing(), r.getRemarks()))
				.toList();
		return new GradingScaleResponse(
				s.getId(), s.getOrganizationId(), s.getName(), s.getDescription(),
				s.isActive(), ruleDtos, s.getCreatedAt(), s.getUpdatedAt());
	}

	private ExaminationResponse toExaminationResponse(
			Examination e, AcademicSession session, SchoolClass sc,
			GradingScale scale, List<ExamScheduleResponse> schedules) {
		return new ExaminationResponse(
				e.getId(), e.getOrganizationId(), e.getAcademicSessionId(),
				session != null ? session.getName() : null,
				e.getClassId(), sc != null ? sc.getName() : null,
				e.getGradingScaleId(), scale != null ? scale.getName() : null,
				e.getName(), e.getExamType(), e.getStartDate(), e.getEndDate(),
				e.getStatus(), e.getInstructions(), e.getFinalizedAt(),
				e.getPublishedAt(), e.getPublishedBy(), schedules,
				e.getCreatedAt(), e.getUpdatedAt());
	}

	private ExamScheduleResponse toScheduleResponse(ExamSchedule s, Subject sub) {
		return new ExamScheduleResponse(
				s.getId(), s.getOrganizationId(), s.getExaminationId(),
				s.getSubjectId(), sub != null ? sub.getName() : null, sub != null ? sub.getCode() : null,
				s.getExamDate(), s.getStartTime(), s.getEndTime(),
				s.getMaxMarks(), s.getPassingMarks(), s.getInvigilatorTeacherId(),
				s.getRoom(), s.getCreatedAt(), s.getUpdatedAt());
	}

	private ExamMarkResponse toMarkResponse(ExamMark m, ExamSchedule sch, Subject sub, Student st) {
		return new ExamMarkResponse(
				m.getId(), m.getOrganizationId(), m.getExaminationId(), m.getExamScheduleId(),
				m.getSubjectId(), sub != null ? sub.getName() : null, sub != null ? sub.getCode() : null,
				m.getStudentId(), st != null ? st.getAdmissionNumber() : null,
				st != null ? st.getFirstName() : null, st != null ? st.getLastName() : null,
				m.getEntryStatus(), m.getMarksObtained(),
				sch != null ? sch.getMaxMarks() : null, sch != null ? sch.getPassingMarks() : null,
				m.getGrade(), m.isPassed(), m.getEnteredBy(), m.getUpdatedBy(),
				m.getRemarks(), m.getCreatedAt(), m.getUpdatedAt());
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@Transactional
	public com.side.forge.storage.dto.StorageDtos.StoredFileResponse uploadExaminationDocument(
			Long orgId, Long examinationId, org.springframework.web.multipart.MultipartFile file) {
		validator.requireOrganization(orgId);
		Examination exam = examinationRepository.findByIdAndOrganizationId(examinationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Examination not found"));
		return fileManagementService.storeOrganizationFile(
				orgId, com.side.forge.storage.entity.FileResourceCategory.GENERAL_ORGANIZATION_FILE,
				file, RESOURCE_EXAMINATION_DOCUMENT, exam.getId());
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public List<com.side.forge.storage.dto.StorageDtos.StoredFileResponse> getExaminationDocuments(
			Long orgId, Long examinationId) {
		validator.requireOrganization(orgId);
		Examination exam = examinationRepository.findByIdAndOrganizationId(examinationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Examination not found"));
		return fileManagementService.getFilesForResource(orgId, RESOURCE_EXAMINATION_DOCUMENT, exam.getId());
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@Transactional(readOnly = true)
	public com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload downloadExaminationDocument(
			Long orgId, Long examinationId, Long fileId) {
		validator.requireOrganization(orgId);
		Examination exam = examinationRepository.findByIdAndOrganizationId(examinationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Examination not found"));
		return fileManagementService.downloadOrganizationFileForAuthorizedResource(
				orgId, fileId, RESOURCE_EXAMINATION_DOCUMENT, exam.getId());
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@Transactional
	public void deleteExaminationDocument(Long orgId, Long examinationId, Long fileId) {
		validator.requireOrganization(orgId);
		Examination exam = examinationRepository.findByIdAndOrganizationId(examinationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Examination not found"));
		fileManagementService.deleteOrganizationFile(orgId, fileId, RESOURCE_EXAMINATION_DOCUMENT, exam.getId());
	}
}

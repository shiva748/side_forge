package com.side.forge.organization.reporting.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.*;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.repository.SubjectRepository;
import com.side.forge.organization.attendance.dto.*;
import com.side.forge.organization.attendance.entity.*;
import com.side.forge.organization.attendance.repository.*;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.examination.entity.*;
import com.side.forge.organization.examination.repository.*;
import com.side.forge.organization.fees.dto.GenerateFeeDemandsRequest.StudentFeeDemandResponse;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.FeePaymentReceiptResponse;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.*;
import com.side.forge.organization.fees.entity.*;
import com.side.forge.organization.fees.repository.*;
import com.side.forge.organization.fees.service.FeeManagementService;
import com.side.forge.organization.reporting.dto.DashboardDtos.*;
import com.side.forge.organization.reporting.dto.ReportDtos.*;
import com.side.forge.organization.reporting.entity.*;
import com.side.forge.organization.reporting.repository.SchoolNoticeRepository;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.organization.reporting.spi.DashboardModuleWidgetContributor;
import com.side.forge.organization.staff.entity.*;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.student.enrollment.entity.*;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.guardian.entity.StudentGuardian;
import com.side.forge.organization.student.guardian.repository.StudentGuardianRepository;
import com.side.forge.organization.student.profile.entity.*;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;
import com.side.forge.organization.teacher.dto.*;
import com.side.forge.organization.teacher.entity.*;
import com.side.forge.organization.teacher.repository.*;
import com.side.forge.organization.teacher.service.TeacherAssignmentService;
import com.side.forge.organization.timetable.dto.TimetableSlotResponse;
import com.side.forge.organization.timetable.service.TimetableService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardAndReportService {

	private static final double DEFAULT_ATTENDANCE_THRESHOLD = 75.0;
	private static final double DEFAULT_ACADEMIC_THRESHOLD = 50.0;

	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final SubjectRepository subjectRepository;
	private final StudentService studentService;
	private final StudentRepository studentRepository;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final StudentGuardianRepository studentGuardianRepository;
	private final StaffRepository staffRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final TeacherClassAssignmentRepository teacherClassAssignmentRepository;
	private final TeacherSubjectAssignmentRepository teacherSubjectAssignmentRepository;
	private final TeacherAssignmentService teacherAssignmentService;
	private final TimetableService timetableService;
	private final StudentAttendanceRepository studentAttendanceRepository;
	private final StaffAttendanceRepository staffAttendanceRepository;
	private final AttendanceAuditLogRepository attendanceAuditLogRepository;
	private final ExaminationRepository examinationRepository;
	private final ExamScheduleRepository examScheduleRepository;
	private final ExamMarkRepository examMarkRepository;
	private final StudentExamResultRepository examResultRepository;
	private final StudentFeeDemandRepository feeDemandRepository;
	private final FeePaymentRepository feePaymentRepository;
	private final StudentFeeConcessionRepository feeConcessionRepository;
	private final FeeAuditLogRepository feeAuditLogRepository;
	private final FeeManagementService feeManagementService;
	private final SchoolNoticeRepository noticeRepository;
	private final ReportExportGenerator exportGenerator;
	private final List<DashboardModuleWidgetContributor> widgetContributors;

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public SchoolNoticeResponse createNotice(Long orgId, CreateSchoolNoticeRequest request) {
		Organization org = validator.requireOrganization(orgId);
		if (request.academicSessionId() != null) {
			sessionService.requireSession(orgId, request.academicSessionId());
		}
		SchoolNotice notice = new SchoolNotice();
		notice.setOrganizationId(orgId);
		notice.setAcademicSessionId(request.academicSessionId());
		notice.setTitle(validator.normalizeRequiredText(request.title(), "Notice title"));
		notice.setContent(validator.normalizeRequiredText(request.content(), "Notice content"));
		notice.setAudience(request.audience() != null ? request.audience() : NoticeAudience.ALL);
		notice.setImportant(Boolean.TRUE.equals(request.important()));
		notice.setPublishedDate(request.publishedDate() != null
				? request.publishedDate()
				: LocalDate.now(validator.resolveZoneId(org)));
		notice.setActive(true);
		notice.setCreatedBy(currentUser.getUserId());
		return toNoticeResponse(noticeRepository.saveAndFlush(notice));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@Transactional(readOnly = true)
	public List<SchoolNoticeResponse> getNotices(Long orgId, Boolean importantOnly) {
		validator.requireOrganization(orgId);
		List<SchoolNotice> rows = Boolean.TRUE.equals(importantOnly)
				? noticeRepository.findAllByOrganizationIdAndActiveTrueAndImportantTrueOrderByPublishedDateDescIdDesc(orgId)
				: noticeRepository.findAllByOrganizationIdAndActiveTrueOrderByImportantDescPublishedDateDescIdDesc(orgId);
		return rows.stream().map(this::toNoticeResponse).toList();
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@Transactional(readOnly = true)
	public AdminDashboardResponse getAdminDashboard(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		if (!isSchoolAdminOrPrincipal()) {
			throw new AccessDeniedException("Only authorized school administrators can access the administrator dashboard");
		}
		LocalDate refDate = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);

		List<Student> allStudents = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId);
		int activeStudentsCount = (int) allStudents.stream()
				.filter(s -> s.getStatus() == StudentStatus.ACTIVE)
				.count();

		List<Staff> activeStaff = staffRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE)
				.toList();
		int activeTeachersCount = (int) activeStaff.stream().filter(Staff::isTeachingStaff).count();
		int activeNonTeachingCount = activeStaff.size() - activeTeachersCount;

		List<SchoolClass> activeClasses = classRepository.findAllByOrganizationIdAndActiveOrderByDisplayOrderAscNameAsc(orgId, true);

		DailyAttendanceSnapshot todayStudentSnap = buildDailyStudentAttendanceSnapshot(
				orgId, session != null ? session.getId() : null, refDate, null);
		DailyAttendanceSnapshot todayStaffSnap = buildDailyStaffAttendanceSnapshot(orgId, refDate, activeStaff.size());
		double overallStudentAttendancePct = session == null ? 0.0
				: computeSessionStudentAttendancePercentage(orgId, session.getId(), null, null, null);

		List<UpcomingExaminationSummary> upcomingExams = session == null ? List.of()
				: buildUpcomingExaminations(orgId, session.getId(), refDate, null);
		List<PublishedExamResultOverview> publishedResults = session == null ? List.of()
				: buildPublishedExamResultOverviews(orgId, session.getId(), null, false);

		FinancialOverviewSnapshot financialSummary = (session != null && canViewFinancials())
				? buildFinancialOverviewSnapshot(orgId, session.getId())
				: null;

		List<SchoolActivityItem> recentActivities = buildRecentActivities(orgId, session != null ? session.getId() : null);
		List<SchoolNoticeResponse> announcements = noticeRepository
				.findAllByOrganizationIdAndActiveTrueOrderByImportantDescPublishedDateDescIdDesc(orgId)
				.stream().limit(10).map(this::toNoticeResponse).toList();

		List<ChartDatasetResponse> charts = buildAdminCharts(orgId, session, activeClasses, financialSummary);
		List<FutureModuleWidgetResponse> extWidgets = collectExtensionWidgets(orgId, session != null ? session.getId() : null);

		boolean empty = allStudents.isEmpty() && activeStaff.isEmpty() && activeClasses.isEmpty();
		return new AdminDashboardResponse(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				session != null ? session.getStatus() : null,
				refDate,
				activeStudentsCount, activeTeachersCount, activeNonTeachingCount, activeStaff.size(),
				activeClasses.size(),
				todayStudentSnap, todayStaffSnap, overallStudentAttendancePct,
				upcomingExams, publishedResults, financialSummary,
				recentActivities, announcements, charts, extWidgets,
				empty, empty ? "No school operational records available yet." : null
		);
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@Transactional(readOnly = true)
	public PrincipalDashboardResponse getPrincipalDashboard(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope,
			LocalDate referenceDate, Double lowAttendanceThreshold, Double academicAttentionThreshold) {
		Organization org = validator.requireOrganization(orgId);
		if (!isSchoolAdminOrPrincipal()) {
			throw new AccessDeniedException("Only principals or school administrators can access the principal dashboard");
		}
		LocalDate refDate = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));
		double attThreshold = lowAttendanceThreshold != null ? lowAttendanceThreshold : DEFAULT_ATTENDANCE_THRESHOLD;
		double acadThreshold = academicAttentionThreshold != null ? academicAttentionThreshold : DEFAULT_ACADEMIC_THRESHOLD;
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);

		List<SchoolClass> classes = classRepository.findAllByOrganizationIdAndActiveOrderByDisplayOrderAscNameAsc(orgId, true);
		List<ClassStrengthAndAttendanceItem> classItems = session == null ? List.of()
				: buildClassStrengthAndAttendanceItems(orgId, session.getId(), classes);
		List<LowAttendanceStudentItem> lowAttendance = session == null ? List.of()
				: buildLowAttendanceStudents(orgId, session.getId(), classes, attThreshold, null, null);
		List<PublishedExamResultOverview> examOverview = session == null ? List.of()
				: buildPublishedExamResultOverviews(orgId, session.getId(), null, false);
		List<UpcomingExaminationSummary> upcomingExams = session == null ? List.of()
				: buildUpcomingExaminations(orgId, session.getId(), refDate, null);

		List<Staff> activeStaff = staffRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE).toList();
		DailyAttendanceSnapshot todayStaff = buildDailyStaffAttendanceSnapshot(orgId, refDate, activeStaff.size());
		double overallStaffPct = computeOverallStaffAttendancePercentage(orgId, null, null);

		List<StudentAcademicAttentionItem> attentionStudents = session == null ? List.of()
				: buildStudentsRequiringAcademicAttention(orgId, session.getId(), null, acadThreshold);
		List<SchoolNoticeResponse> importantNotices = noticeRepository
				.findAllByOrganizationIdAndActiveTrueAndImportantTrueOrderByPublishedDateDescIdDesc(orgId)
				.stream().map(this::toNoticeResponse).toList();

		List<ChartDatasetResponse> charts = buildPrincipalCharts(classItems, examOverview);
		List<FutureModuleWidgetResponse> extWidgets = collectExtensionWidgets(orgId, session != null ? session.getId() : null);
		boolean empty = classItems.isEmpty() && examOverview.isEmpty() && activeStaff.isEmpty();

		return new PrincipalDashboardResponse(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				refDate, attThreshold, acadThreshold,
				classItems, lowAttendance, examOverview, upcomingExams,
				todayStaff, overallStaffPct, attentionStudents, importantNotices,
				charts, extWidgets, empty,
				empty ? "No academic or operational performance records available for the selected session." : null
		);
	}

	@RequirePermission(PermissionCode.FEES_REPORT_VIEW)
	@Transactional(readOnly = true)
	public AccountantDashboardResponse getAccountantDashboard(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		if (!canViewFinancials()) {
			throw new AccessDeniedException("User does not have permission to view financial dashboards");
		}
		LocalDate refDate = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);

		if (session == null) {
			BigDecimal zero = zero();
			return new AccountantDashboardResponse(
					orgId, org.getName(), null, null, refDate,
					zero, zero, zero, zero, zero, zero,
					List.of(), List.of(), List.of(), List.of(),
					new ConcessionWaiverSummary(0, 0, 0, zero, Map.of()),
					List.of(), collectExtensionWidgets(orgId, null),
					true, "No academic session found for financial dashboard.");
		}

		SessionFeeDashboardReportResponse feeDash = feeManagementService.getSessionFeeDashboardReport(orgId, session.getId());
		List<FeePayment> sessionPayments = feePaymentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByPaymentDateDescIdDesc(orgId, session.getId());
		List<FeePaymentReceiptResponse> recentReceipts = sessionPayments.stream()
				.limit(10)
				.map(p -> feeManagementService.getReceiptById(orgId, p.getId()))
				.toList();
		List<FeePaymentReceiptResponse> recentCompleted = recentReceipts.stream()
				.filter(r -> r.status() == PaymentStatus.COMPLETED || r.status() == PaymentStatus.PARTIALLY_REFUNDED)
				.toList();

		ConcessionWaiverSummary concSummary = buildConcessionWaiverSummary(orgId, session.getId(), null);
		List<ChartDatasetResponse> charts = buildAccountantCharts(feeDash);
		List<FutureModuleWidgetResponse> extWidgets = collectExtensionWidgets(orgId, session.getId());
		boolean empty = feeDash.totalNetFeesExpected().compareTo(BigDecimal.ZERO) == 0 && sessionPayments.isEmpty();

		return new AccountantDashboardResponse(
				orgId, org.getName(), session.getId(), session.getName(), refDate,
				feeDash.totalNetFeesExpected(),
				feeDash.totalCollectedAmount(),
				feeDash.totalRefundedAmount(),
				feeDash.totalUnappliedAccountCredit(),
				feeDash.totalOutstandingFees(),
				feeDash.totalOverdueFees(),
				feeDash.monthlyCollectionBreakdown(),
				feeDash.classWiseBreakdown(),
				recentCompleted,
				recentReceipts,
				concSummary,
				charts,
				extWidgets,
				empty,
				empty ? "No fee demands or payment transactions recorded for this session yet." : null
		);
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@Transactional(readOnly = true)
	public TeacherDashboardResponse getTeacherDashboard(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope,
			Long requestedTeacherId, LocalDate referenceDate) {
		Organization org = validator.requireOrganization(orgId);
		LocalDate refDate = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);

		TeacherProfile teacher = resolveTargetTeacher(orgId, requestedTeacherId);
		Staff staff = staffRepository.findByIdAndOrganizationId(teacher.getStaffId(), orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff profile not found for teacher"));
		String teacherName = staff.getFirstName() + (staff.getLastName() != null ? " " + staff.getLastName() : "");

		List<TeacherClassAssignmentResponse> assignedClasses = session == null ? List.of()
				: teacherAssignmentService.getTeacherClassAssignments(orgId, teacher.getId(), session.getId());
		List<TeacherSubjectAssignmentResponse> assignedSubjects = session == null ? List.of()
				: teacherAssignmentService.getTeacherSubjectAssignments(orgId, teacher.getId(), session.getId(), null);

		Set<Long> assignedClassIds = new LinkedHashSet<>();
		Map<Long, Boolean> classTeacherFlagMap = new LinkedHashMap<>();
		for (TeacherClassAssignmentResponse ca : assignedClasses) {
			assignedClassIds.add(ca.classId());
			classTeacherFlagMap.put(ca.classId(), ca.classTeacher());
		}
		for (TeacherSubjectAssignmentResponse sa : assignedSubjects) {
			assignedClassIds.add(sa.classId());
			classTeacherFlagMap.putIfAbsent(sa.classId(), false);
		}

		List<TimetableSlotResponse> todayTimetable = session == null ? List.of()
				: timetableService.getTeacherTimetable(orgId, teacher.getId(), session.getId(), refDate.getDayOfWeek());

		List<SchoolClass> assignedSchoolClasses = assignedClassIds.isEmpty() ? List.of()
				: classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
						.filter(c -> assignedClassIds.contains(c.getId()))
						.toList();

		List<TeacherAttendanceTaskItem> attendanceTasks = new ArrayList<>();
		if (session != null) {
			for (SchoolClass sc : assignedSchoolClasses) {
				int enrolled = (int) enrollmentRepository
						.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(orgId, session.getId(), sc.getId())
						.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).count();
				int marked = studentAttendanceRepository
						.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndAttendanceDateOrderByStudentIdAsc(
								orgId, session.getId(), sc.getId(), refDate)
						.size();
				int pending = Math.max(0, enrolled - marked);
				attendanceTasks.add(new TeacherAttendanceTaskItem(
						sc.getId(), sc.getCode(), sc.getName(),
						Boolean.TRUE.equals(classTeacherFlagMap.get(sc.getId())),
						refDate, enrolled, marked, pending,
						enrolled > 0 && pending == 0
				));
			}
		}

		List<ClassStrengthAndAttendanceItem> classAttendanceSummary = session == null ? List.of()
				: buildClassStrengthAndAttendanceItems(orgId, session.getId(), assignedSchoolClasses);
		List<UpcomingExaminationSummary> upcomingExams = (session == null || assignedClassIds.isEmpty()) ? List.of()
				: buildUpcomingExaminations(orgId, session.getId(), refDate, assignedClassIds);

		List<FutureModuleWidgetResponse> extWidgets = collectExtensionWidgets(
				orgId, session != null ? session.getId() : null);
		FutureModuleWidgetResponse homeworkWidget = extWidgets.stream()
				.filter(w -> "HOMEWORK".equalsIgnoreCase(w.moduleCode()))
				.findFirst()
				.orElse(new FutureModuleWidgetResponse(
						"HOMEWORK", "Homework & Assignments", false,
						"Homework module is not active for this school.", Map.of("assignedCount", 0, "pendingEvaluationCount", 0)));

		List<SchoolNoticeResponse> notices = noticeRepository
				.findAllByOrganizationIdAndActiveTrueAndAudienceInOrderByImportantDescPublishedDateDescIdDesc(
						orgId, List.of(NoticeAudience.ALL, NoticeAudience.TEACHERS, NoticeAudience.STAFF))
				.stream().map(this::toNoticeResponse).toList();

		boolean empty = assignedClasses.isEmpty() && assignedSubjects.isEmpty() && todayTimetable.isEmpty();
		return new TeacherDashboardResponse(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				teacher.getId(), staff.getId(), teacherName, refDate,
				assignedClasses, assignedSubjects, todayTimetable,
				attendanceTasks, classAttendanceSummary, upcomingExams,
				homeworkWidget, notices, extWidgets,
				empty, empty ? "No classes, subjects, or timetable slots assigned for this academic session." : null
		);
	}

	@RequirePermission(PermissionCode.REPORT_VIEW)
	@Transactional(readOnly = true)
	public StudentEnrollmentReportResponse getStudentEnrollmentReport(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope,
			DateRangePreset datePreset, LocalDate startDate, LocalDate endDate, String selectedMonth,
			Long classId, int page, int size) {
		Organization org = validator.requireOrganization(orgId);
		if (!currentUser.hasPermission(PermissionCode.STUDENT_VIEW.getValue())) {
			throw new AccessDeniedException("User does not have permission to view student reports");
		}
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);
		LocalDate[] range = resolveDateRange(org, session, datePreset, startDate, endDate, selectedMonth);
		Set<Long> teacherScopedClassIds = resolveTeacherRestrictedClassIds(orgId, session != null ? session.getId() : null, classId);

		List<Student> allStudents = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId);
		Map<Long, Student> studentMap = allStudents.stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		List<SchoolClass> classes = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId);
		Map<Long, SchoolClass> classMap = classes.stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));

		List<StudentEnrollment> sessionEnrollments = session == null ? List.of()
				: enrollmentRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(orgId, session.getId())
						.stream()
						.filter(e -> classId == null || e.getClassId().equals(classId))
						.filter(e -> teacherScopedClassIds == null || teacherScopedClassIds.contains(e.getClassId()))
						.toList();
		Map<Long, StudentEnrollment> enrollmentByStudent = sessionEnrollments.stream()
				.collect(Collectors.toMap(StudentEnrollment::getStudentId, Function.identity(), (a, b) -> a));

		Set<Long> studentsWithGuardians = studentGuardianRepository
				.findAllByOrganizationIdOrderByStudentIdAscIdAsc(orgId).stream()
				.map(StudentGuardian::getStudentId)
				.collect(Collectors.toSet());

		List<Student> scopedStudents = (classId != null || teacherScopedClassIds != null)
				? allStudents.stream().filter(s -> enrollmentByStudent.containsKey(s.getId())).toList()
				: allStudents;

		Map<StudentStatus, Integer> statusDist = new EnumMap<>(StudentStatus.class);
		for (StudentStatus st : StudentStatus.values()) {
			statusDist.put(st, 0);
		}
		Map<Gender, Integer> genderDist = new EnumMap<>(Gender.class);
		for (Gender g : Gender.values()) {
			genderDist.put(g, 0);
		}

		int activeCount = 0;
		int inactiveCount = 0;
		List<StudentReportRecordItem> allRecordItems = new ArrayList<>();
		List<StudentReportRecordItem> newAdmissions = new ArrayList<>();
		List<StudentReportRecordItem> withdrawalsAndInactive = new ArrayList<>();
		List<StudentReportRecordItem> incompleteProfiles = new ArrayList<>();
		List<StudentReportRecordItem> enrollmentChanges = new ArrayList<>();

		LocalDate sessionStart = session != null && session.getStartDate() != null
				? session.getStartDate()
				: LocalDate.of(LocalDate.now(validator.resolveZoneId(org)).getYear(), 4, 1);

		for (Student s : scopedStudents) {
			statusDist.put(s.getStatus(), statusDist.getOrDefault(s.getStatus(), 0) + 1);
			if (s.getGender() != null) {
				genderDist.put(s.getGender(), genderDist.getOrDefault(s.getGender(), 0) + 1);
			}
			if (s.getStatus() == StudentStatus.ACTIVE) {
				activeCount++;
			} else {
				inactiveCount++;
			}

			StudentEnrollment enr = enrollmentByStudent.get(s.getId());
			SchoolClass sc = enr != null ? classMap.get(enr.getClassId()) : null;
			List<String> missing = detectMissingProfileFields(s, studentsWithGuardians.contains(s.getId()));
			StudentReportRecordItem item = toStudentReportRecordItem(s, enr, sc, missing);
			allRecordItems.add(item);

			if (isWithinRange(s.getAdmissionDate(), range[0], range[1])) {
				newAdmissions.add(item);
			}
			if (s.getStatus() != StudentStatus.ACTIVE
					|| (enr != null && enr.getStatus() != EnrollmentStatus.ACTIVE)) {
				withdrawalsAndInactive.add(item);
			}
			if (!missing.isEmpty()) {
				incompleteProfiles.add(item);
			}
			if (enr != null && (enr.getStatus() != EnrollmentStatus.ACTIVE
					|| (enr.getEnrollmentDate() != null && enr.getEnrollmentDate().isAfter(sessionStart))
					|| (enr.getRemarks() != null && !enr.getRemarks().isBlank()))) {
				enrollmentChanges.add(item);
			}
		}

		List<ClassStudentCountItem> classCounts = buildClassStudentCounts(classes, sessionEnrollments, classId, teacherScopedClassIds);
		List<SessionEnrollmentCountItem> sessionCounts = buildSessionEnrollmentCounts(orgId);
		PagedResponse<StudentReportRecordItem> pagedDirectory = paginateList(allRecordItems, page, size);
		List<ChartDatasetResponse> charts = buildStudentEnrollmentCharts(classCounts, genderDist);

		AppliedReportFilters filters = new AppliedReportFilters(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				sessionScope != null ? sessionScope : (academicSessionId != null ? AcademicSessionScope.SPECIFIC : AcademicSessionScope.CURRENT),
				datePreset != null ? datePreset : DateRangePreset.SESSION,
				range[0], range[1], selectedMonth, classId, null, null, null, null);

		boolean empty = allRecordItems.isEmpty();
		return new StudentEnrollmentReportResponse(
				filters, activeCount, inactiveCount, statusDist,
				classCounts, sessionCounts, newAdmissions, withdrawalsAndInactive,
				genderDist, incompleteProfiles, enrollmentChanges, pagedDirectory,
				charts, empty, empty ? "No student or enrollment records match the selected filters." : null
		);
	}

	@RequirePermission(PermissionCode.REPORT_VIEW)
	@Transactional(readOnly = true)
	public AttendanceReportResponse getAttendanceReport(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope,
			DateRangePreset datePreset, LocalDate startDate, LocalDate endDate, String selectedMonth,
			Long classId, Long studentId, Long staffId, Double threshold, int page, int size) {
		Organization org = validator.requireOrganization(orgId);
		if (!currentUser.hasPermission(PermissionCode.ATTENDANCE_VIEW.getValue())
				&& !currentUser.hasPermission(PermissionCode.STAFF_ATTENDANCE_VIEW.getValue())) {
			throw new AccessDeniedException("User does not have permission to view attendance reports");
		}
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);
		LocalDate[] range = resolveDateRange(org, session, datePreset, startDate, endDate, selectedMonth);
		double minThreshold = threshold != null ? threshold : DEFAULT_ATTENDANCE_THRESHOLD;
		Set<Long> teacherScopedClassIds = resolveTeacherRestrictedClassIds(orgId, session != null ? session.getId() : null, classId);

		List<SchoolClass> classes = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId)
				.stream()
				.filter(c -> classId == null || c.getId().equals(classId))
				.filter(c -> teacherScopedClassIds == null || teacherScopedClassIds.contains(c.getId()))
				.toList();
		Map<Long, SchoolClass> classMap = classes.stream().collect(Collectors.toMap(SchoolClass::getId, Function.identity()));

		List<StudentAttendance> studentRows = session == null ? List.of()
				: studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByAttendanceDateDescStudentIdAsc(
						orgId, session.getId()).stream()
						.filter(r -> classMap.containsKey(r.getClassId()))
						.filter(r -> studentId == null || r.getStudentId().equals(studentId))
						.filter(r -> isWithinRange(r.getAttendanceDate(), range[0], range[1]))
						.toList();

		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		LocalDate snapDate = range[1] != null ? range[1] : LocalDate.now(validator.resolveZoneId(org));
		DailyAttendanceSnapshot dailyStudent = buildDailyStudentAttendanceSnapshot(
				orgId, session != null ? session.getId() : null, snapDate, classMap.keySet());

		boolean canViewStaffAtt = currentUser.hasPermission(PermissionCode.STAFF_ATTENDANCE_VIEW.getValue());
		List<Staff> allStaff = canViewStaffAtt ? staffRepository.findAllByOrganizationIdOrderByIdAsc(orgId) : List.of();
		DailyAttendanceSnapshot dailyStaff = canViewStaffAtt
				? buildDailyStaffAttendanceSnapshot(orgId, snapDate,
						(int) allStaff.stream().filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE).count())
				: null;

		List<MonthlyAttendanceTrendItem> monthlyTrends = buildMonthlyAttendanceTrends(studentRows);
		List<ClassAttendancePercentageItem> classPercentages = session == null ? List.of()
				: buildClassAttendancePercentageItems(orgId, session.getId(), classes, studentRows);

		Map<Long, List<StudentAttendance>> byStudent = studentRows.stream()
				.collect(Collectors.groupingBy(StudentAttendance::getStudentId, LinkedHashMap::new, Collectors.toList()));
		List<StudentAttendanceSummaryResponse> studentSummaries = byStudent.entrySet().stream()
				.map(e -> calculateStudentSummary(studentMap.get(e.getKey()), e.getValue()))
				.sorted(Comparator.comparing(StudentAttendanceSummaryResponse::studentName))
				.toList();
		PagedResponse<StudentAttendanceSummaryResponse> pagedStudentSummaries = paginateList(studentSummaries, page, size);

		List<StudentAttendanceResponse> historyList = studentRows.stream()
				.map(r -> toStudentAttendanceResponse(r, classMap.get(r.getClassId()), studentMap.get(r.getStudentId())))
				.toList();
		List<StudentAttendanceResponse> absentReport = historyList.stream()
				.filter(r -> r.status() == StudentAttendanceStatus.ABSENT).toList();
		List<StudentAttendanceResponse> lateReport = historyList.stream()
				.filter(r -> r.status() == StudentAttendanceStatus.LATE).toList();

		List<LowAttendanceStudentItem> lowAttendance = session == null ? List.of()
				: buildLowAttendanceStudents(orgId, session.getId(), classes, minThreshold, range[0], range[1]);
		List<DailyAttendanceSnapshot> dailyTrends = buildDailyTrendsFromRows(studentRows);
		List<StaffAttendanceSummaryResponse> staffSummaries = canViewStaffAtt
				? buildStaffAttendanceSummaries(orgId, allStaff, staffId, range[0], range[1])
				: List.of();

		List<ChartDatasetResponse> charts = buildAttendanceCharts(dailyTrends, monthlyTrends, classPercentages);
		AppliedReportFilters filters = new AppliedReportFilters(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				sessionScope != null ? sessionScope : (academicSessionId != null ? AcademicSessionScope.SPECIFIC : AcademicSessionScope.CURRENT),
				datePreset != null ? datePreset : DateRangePreset.SESSION,
				range[0], range[1], selectedMonth, classId, null, studentId, staffId, minThreshold);

		boolean empty = studentRows.isEmpty() && staffSummaries.isEmpty();
		return new AttendanceReportResponse(
				filters, dailyStudent, dailyStaff, monthlyTrends, classPercentages,
				pagedStudentSummaries, historyList, staffSummaries,
				absentReport, lateReport, lowAttendance, dailyTrends,
				charts, empty, empty ? "No attendance records found for the selected filters." : null
		);
	}

	@RequirePermission(PermissionCode.REPORT_VIEW)
	@Transactional(readOnly = true)
	public ExaminationPerformanceReportResponse getExaminationPerformanceReport(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope,
			Long classId, Long examinationId, Long studentId, Boolean includeDrafts, Double threshold) {
		Organization org = validator.requireOrganization(orgId);
		if (!currentUser.hasPermission(PermissionCode.EXAM_VIEW.getValue())) {
			throw new AccessDeniedException("User does not have permission to view examination reports");
		}
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);
		double acadThreshold = threshold != null ? threshold : DEFAULT_ACADEMIC_THRESHOLD;
		Set<Long> teacherScopedClassIds = resolveTeacherRestrictedClassIds(orgId, session != null ? session.getId() : null, classId);
		boolean allowDrafts = Boolean.TRUE.equals(includeDrafts)
				&& (currentUser.hasPermission(PermissionCode.EXAM_MANAGE.getValue())
						|| currentUser.hasPermission(PermissionCode.EXAM_PUBLISH_RESULTS.getValue()));

		List<SchoolClass> classes = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId);
		Map<Long, SchoolClass> classMap = classes.stream().collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Subject> subjectMap = subjectRepository.findAllByOrganizationIdOrderByNameAsc(orgId).stream()
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		List<Examination> allExams = session == null ? List.of()
				: examinationRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(orgId, session.getId())
						.stream()
						.filter(e -> classId == null || e.getClassId().equals(classId))
						.filter(e -> teacherScopedClassIds == null || teacherScopedClassIds.contains(e.getClassId()))
						.filter(e -> examinationId == null || e.getId().equals(examinationId))
						.toList();

		int officialCount = (int) allExams.stream().filter(this::isOfficialExamForCaller).count();
		int draftCount = allExams.size() - officialCount;
		List<Examination> includedExams = allExams.stream().filter(e -> allowDrafts || isOfficialExamForCaller(e)).toList();

		List<PublishedExamResultOverview> examSummaries = new ArrayList<>();
		List<SubjectPerformanceSummaryItem> subjectSummaries = new ArrayList<>();
		List<StudentAcademicHistoryItem> studentHistory = new ArrayList<>();
		List<ExamComparisonItem> comparisons = new ArrayList<>();
		Map<String, Integer> gradeDist = new LinkedHashMap<>();
		Map<Long, List<StudentExamResult>> officialResultsByClass = new LinkedHashMap<>();

		int totalEval = 0, totalPass = 0, totalFail = 0;
		BigDecimal sumOfficialPct = zero();

		for (Examination exam : includedExams) {
			boolean official = isOfficialStatus(exam.getStatus());
			SchoolClass sc = classMap.get(exam.getClassId());
			String className = sc != null ? sc.getName() : "";

			List<StudentExamResult> results = examResultRepository
					.findAllByOrganizationIdAndExaminationIdOrderByPercentageDescStudentIdAsc(orgId, exam.getId())
					.stream().filter(r -> studentId == null || r.getStudentId().equals(studentId)).toList();

			int passed = (int) results.stream().filter(StudentExamResult::isOverallPassed).count();
			int failed = results.size() - passed;
			double passPct = results.isEmpty() ? 0.0 : round2((passed * 100.0) / results.size());
			BigDecimal avgPct = results.isEmpty() ? zero()
					: results.stream().map(StudentExamResult::getPercentage)
							.reduce(zero(), BigDecimal::add)
							.divide(BigDecimal.valueOf(results.size()), 2, RoundingMode.HALF_UP);

			examSummaries.add(new PublishedExamResultOverview(
					exam.getId(), exam.getName(), exam.getExamType(), exam.getStatus(),
					official, exam.getClassId(), className, results.size(), passed, failed, passPct, avgPct, exam.getPublishedAt()));
			comparisons.add(new ExamComparisonItem(
					exam.getId(), exam.getName(), exam.getExamType(), exam.getStatus(),
					official, exam.getClassId(), className, exam.getStartDate(), avgPct, passPct, results.size()));

			if (official) {
				totalEval += results.size();
				totalPass += passed;
				totalFail += failed;
				for (StudentExamResult r : results) {
					sumOfficialPct = sumOfficialPct.add(r.getPercentage());
					gradeDist.merge(r.getOverallGrade(), 1, Integer::sum);
					officialResultsByClass.computeIfAbsent(exam.getClassId(), k -> new ArrayList<>()).add(r);
				}
			}
			for (StudentExamResult r : results) {
				Student st = studentMap.get(r.getStudentId());
				studentHistory.add(new StudentAcademicHistoryItem(
						r.getStudentId(), st != null ? st.getAdmissionNumber() : null, fullName(st),
						exam.getId(), exam.getName(), exam.getExamType(), exam.getStatus(),
						official, exam.getClassId(), className,
						r.getTotalObtainedMarks(), r.getTotalMaxMarks(), r.getPercentage(),
						r.getOverallGrade(), r.isOverallPassed()));
			}
			if (official || allowDrafts) {
				subjectSummaries.addAll(buildSubjectSummariesForExam(orgId, exam, className, subjectMap, studentId));
			}
		}

		List<ClassAcademicPerformanceItem> classPerf = buildClassAcademicPerformance(classes, officialResultsByClass, allExams);
		List<StudentAcademicAttentionItem> attentionList = session == null ? List.of()
				: buildStudentsRequiringAcademicAttention(orgId, session.getId(), classId, acadThreshold);
		double overallPassPct = totalEval == 0 ? 0.0 : round2((totalPass * 100.0) / totalEval);
		BigDecimal overallAvgPct = totalEval == 0 ? zero()
				: sumOfficialPct.divide(BigDecimal.valueOf(totalEval), 2, RoundingMode.HALF_UP);

		List<ChartDatasetResponse> charts = buildExaminationCharts(gradeDist, subjectSummaries, comparisons);
		AppliedReportFilters filters = new AppliedReportFilters(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				sessionScope != null ? sessionScope : (academicSessionId != null ? AcademicSessionScope.SPECIFIC : AcademicSessionScope.CURRENT),
				DateRangePreset.SESSION, null, null, null, classId, examinationId, studentId, null, acadThreshold);

		boolean empty = examSummaries.isEmpty();
		return new ExaminationPerformanceReportResponse(
				filters, !allowDrafts, officialCount, draftCount,
				totalEval, totalPass, totalFail, overallPassPct, overallAvgPct,
				examSummaries, classPerf, subjectSummaries, studentHistory,
				gradeDist, attentionList, comparisons, charts,
				empty, empty ? "No finalized or published examination results available for the selected filters." : null
		);
	}

	@RequirePermission(PermissionCode.FEES_REPORT_VIEW)
	@Transactional(readOnly = true)
	public FinancialReportResponse getFinancialReport(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope,
			DateRangePreset datePreset, LocalDate startDate, LocalDate endDate, String selectedMonth,
			Long classId, Long studentId, int page, int size) {
		Organization org = validator.requireOrganization(orgId);
		if (!canViewFinancials()) {
			throw new AccessDeniedException("User does not have permission to view financial reports");
		}
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);
		LocalDate[] range = resolveDateRange(org, session, datePreset, startDate, endDate, selectedMonth);

		AppliedReportFilters filters = new AppliedReportFilters(
				orgId, org.getName(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				sessionScope != null ? sessionScope : (academicSessionId != null ? AcademicSessionScope.SPECIFIC : AcademicSessionScope.CURRENT),
				datePreset != null ? datePreset : DateRangePreset.SESSION,
				range[0], range[1], selectedMonth, classId, null, studentId, null, null);

		if (session == null) {
			BigDecimal z = zero();
			return new FinancialReportResponse(
					filters, z, z, z, z, z, z, z, z, z,
					z, z, z, z, z, z, z, z, z,
					List.of(), List.of(), paginateList(List.of(), page, size),
					Map.of(), new ConcessionWaiverSummary(0, 0, 0, z, Map.of()),
					List.of(), new DateRangeCollectionSummary(range[0], range[1], 0, 0, z, z, z, Map.of()),
					List.of(), true, "No academic session available for financial reporting.");
		}

		List<StudentFeeDemand> allDemands = feeDemandRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscStudentIdAscDueDateAscIdAsc(orgId, session.getId())
				.stream()
				.filter(d -> d.getStatus() != FeeDemandStatus.CANCELLED)
				.filter(d -> classId == null || d.getClassId().equals(classId))
				.filter(d -> studentId == null || d.getStudentId().equals(studentId))
				.toList();

		BigDecimal totalBase = zero(), totalConc = zero(), totalLate = zero(), totalNet = zero();
		BigDecimal totalCollected = zero(), totalOut = zero(), totalOverdue = zero();
		BigDecimal mDem = zero(), mCol = zero(), mOut = zero();
		BigDecimal yDem = zero(), yCol = zero(), yOut = zero();
		BigDecimal oDem = zero(), oCol = zero(), oOut = zero();

		List<StudentFeeDemand> partialAndUnpaid = new ArrayList<>();
		Map<Long, List<StudentFeeDemand>> byStudent = new LinkedHashMap<>();

		for (StudentFeeDemand d : allDemands) {
			totalBase = totalBase.add(d.getBaseAmount());
			totalConc = totalConc.add(d.getConcessionAmount());
			totalLate = totalLate.add(d.getLateFeeAmount());
			totalNet = totalNet.add(d.getNetPayableAmount());
			totalCollected = totalCollected.add(d.getPaidAmount());
			totalOut = totalOut.add(d.getOutstandingAmount());
			if (d.getStatus() == FeeDemandStatus.OVERDUE) {
				totalOverdue = totalOverdue.add(d.getOutstandingAmount());
			}
			if (d.getFrequency() == FeeFrequency.MONTHLY) {
				mDem = mDem.add(d.getNetPayableAmount());
				mCol = mCol.add(d.getPaidAmount());
				mOut = mOut.add(d.getOutstandingAmount());
			} else if (d.getFrequency() == FeeFrequency.YEARLY) {
				yDem = yDem.add(d.getNetPayableAmount());
				yCol = yCol.add(d.getPaidAmount());
				yOut = yOut.add(d.getOutstandingAmount());
			} else {
				oDem = oDem.add(d.getNetPayableAmount());
				oCol = oCol.add(d.getPaidAmount());
				oOut = oOut.add(d.getOutstandingAmount());
			}
			if (d.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0) {
				partialAndUnpaid.add(d);
			}
			byStudent.computeIfAbsent(d.getStudentId(), k -> new ArrayList<>()).add(d);
		}

		SessionFeeDashboardReportResponse sessionFeeDash = feeManagementService.getSessionFeeDashboardReport(orgId, session.getId());
		List<ClassFeeReportItem> classFeeBreakdown = sessionFeeDash.classWiseBreakdown().stream()
				.filter(c -> classId == null || c.classId().equals(classId))
				.toList();

		Map<Long, SchoolClass> classMap = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		List<FeePayment> allPayments = feePaymentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByPaymentDateDescIdDesc(orgId, session.getId())
				.stream()
				.filter(p -> studentId == null || p.getStudentId().equals(studentId))
				.toList();

		List<StudentFeeStatementSummaryItem> statements = buildStudentStatementItems(byStudent, allPayments, studentMap, classMap);
		PagedResponse<StudentFeeStatementSummaryItem> statementsPage = paginateList(statements, page, size);
		List<StudentFeeDemandResponse> partialAndUnpaidDtos = partialAndUnpaid.stream()
				.map(d -> toDemandDto(d, classMap.get(d.getClassId()), studentMap.get(d.getStudentId())))
				.toList();

		ConcessionWaiverSummary concSummary = buildConcessionWaiverSummary(orgId, session.getId(), studentId);
		DateRangeCollectionSummary rangeSummary = buildDateRangeCollectionSummary(allPayments, range[0], range[1]);
		List<ChartDatasetResponse> charts = buildAccountantCharts(sessionFeeDash);

		boolean empty = allDemands.isEmpty() && allPayments.isEmpty();
		return new FinancialReportResponse(
				filters,
				totalBase, totalConc, totalLate, totalNet,
				totalCollected, sessionFeeDash.totalRefundedAmount(), sessionFeeDash.totalUnappliedAccountCredit(),
				totalOut, totalOverdue,
				mDem, mCol, mOut,
				yDem, yCol, yOut,
				oDem, oCol, oOut,
				sessionFeeDash.monthlyCollectionBreakdown(),
				classFeeBreakdown,
				statementsPage,
				sessionFeeDash.collectionByPaymentMethod(),
				concSummary,
				partialAndUnpaidDtos,
				rangeSummary,
				charts,
				empty,
				empty ? "No financial records found for the selected filters." : null
		);
	}

	@RequirePermission(PermissionCode.REPORT_EXPORT)
	@Transactional(readOnly = true)
	public ExportDocument exportReport(
			Long orgId, String reportType, ExportFormat format,
			Long academicSessionId, AcademicSessionScope sessionScope,
			DateRangePreset datePreset, LocalDate startDate, LocalDate endDate, String selectedMonth,
			Long classId, Long examinationId, Long studentId, Long staffId, Double threshold) {
		Organization org = validator.requireOrganization(orgId);
		ExportFormat fmt = format != null ? format : ExportFormat.CSV;
		String normalizedType = reportType == null ? "" : reportType.trim().toLowerCase(Locale.ROOT);

		return switch (normalizedType) {
			case "students-enrollment", "students" -> {
				StudentEnrollmentReportResponse rep = getStudentEnrollmentReport(
						orgId, academicSessionId, sessionScope, datePreset, startDate, endDate, selectedMonth,
						classId, 0, 10000);
				List<String> headers = List.of(
						"Admission No", "Student Name", "Gender", "Status", "Class",
						"Roll No", "Admission Date", "Enrollment Status");
				List<List<String>> rows = rep.studentDirectoryPage().content().stream()
						.map(r -> List.of(
								nullToEmpty(r.admissionNumber()),
								nullToEmpty(r.fullName()),
								r.gender() != null ? r.gender().name() : "",
								r.studentStatus() != null ? r.studentStatus().name() : "",
								nullToEmpty(r.className()),
								nullToEmpty(r.rollNumber()),
								r.admissionDate() != null ? r.admissionDate().toString() : "",
								r.enrollmentStatus() != null ? r.enrollmentStatus().name() : ""))
						.toList();
				Map<String, String> totals = new LinkedHashMap<>();
				totals.put("Total Active Students", String.valueOf(rep.totalActiveStudents()));
				totals.put("Total Inactive/Withdrawn Students", String.valueOf(rep.totalInactiveOrWithdrawnStudents()));
				totals.put("New Admissions In Period", String.valueOf(rep.newAdmissionsInPeriod().size()));
				yield exportGenerator.generate(
						fmt, "student_enrollment_report", org.getName(), "Student & Enrollment Report",
						rep.filters().academicSessionName(), rep.filters().startDate(), rep.filters().endDate(),
						headers, rows, totals);
			}
			case "attendance" -> {
				AttendanceReportResponse rep = getAttendanceReport(
						orgId, academicSessionId, sessionScope, datePreset, startDate, endDate, selectedMonth,
						classId, studentId, staffId, threshold, 0, 10000);
				List<String> headers = List.of(
						"Admission No", "Student Name", "Applicable Days", "Present", "Late",
						"Half Day", "Absent", "Attendance %");
				List<List<String>> rows = rep.studentAttendanceSummariesPage().content().stream()
						.map(s -> List.of(
								nullToEmpty(s.admissionNumber()),
								nullToEmpty(s.studentName()),
								String.valueOf(s.applicableWorkingDays()),
								String.valueOf(s.presentCount()),
								String.valueOf(s.lateCount()),
								String.valueOf(s.halfDayCount()),
								String.valueOf(s.absentCount()),
								String.valueOf(s.attendancePercentage())))
						.toList();
				Map<String, String> totals = new LinkedHashMap<>();
				totals.put("Total Evaluated Students", String.valueOf(rows.size()));
				totals.put("Students Below Threshold", String.valueOf(rep.studentsBelowThreshold().size()));
				yield exportGenerator.generate(
						fmt, "attendance_report", org.getName(), "Attendance Report",
						rep.filters().academicSessionName(), rep.filters().startDate(), rep.filters().endDate(),
						headers, rows, totals);
			}
			case "examinations", "academic-performance" -> {
				ExaminationPerformanceReportResponse rep = getExaminationPerformanceReport(
						orgId, academicSessionId, sessionScope, classId, examinationId, studentId, false, threshold);
				List<String> headers = List.of(
						"Examination", "Class", "Admission No", "Student Name",
						"Obtained Marks", "Max Marks", "Percentage", "Grade", "Result");
				List<List<String>> rows = rep.studentAcademicPerformanceHistory().stream()
						.map(h -> List.of(
								nullToEmpty(h.examinationName()),
								nullToEmpty(h.className()),
								nullToEmpty(h.admissionNumber()),
								nullToEmpty(h.studentName()),
								h.totalObtainedMarks().toPlainString(),
								h.totalMaxMarks().toPlainString(),
								h.percentage().toPlainString(),
								nullToEmpty(h.overallGrade()),
								h.overallPassed() ? "PASS" : "FAIL"))
						.toList();
				Map<String, String> totals = new LinkedHashMap<>();
				totals.put("Total Evaluated Records", String.valueOf(rep.totalEvaluatedRecords()));
				totals.put("Overall Pass Percentage", String.valueOf(rep.overallPassPercentage()));
				totals.put("Overall Average Percentage", rep.overallAveragePercentage().toPlainString());
				yield exportGenerator.generate(
						fmt, "examination_performance_report", org.getName(), "Examination & Academic Performance Report",
						rep.filters().academicSessionName(), rep.filters().startDate(), rep.filters().endDate(),
						headers, rows, totals);
			}
			case "financial", "fees" -> {
				if (!currentUser.hasPermission(PermissionCode.FEES_REPORT_VIEW.getValue())) {
					throw new AccessDeniedException("User does not have permission to export financial reports");
				}
				FinancialReportResponse rep = getFinancialReport(
						orgId, academicSessionId, sessionScope, datePreset, startDate, endDate, selectedMonth,
						classId, studentId, 0, 10000);
				List<String> headers = List.of(
						"Admission No", "Student Name", "Class", "Base Fee", "Concession",
						"Late Fee", "Net Payable", "Paid", "Outstanding", "Overdue");
				List<List<String>> rows = rep.studentWiseFeeStatementsPage().content().stream()
						.map(s -> List.of(
								nullToEmpty(s.admissionNumber()),
								nullToEmpty(s.studentName()),
								nullToEmpty(s.className()),
								s.totalBaseAmount().toPlainString(),
								s.totalConcessionAmount().toPlainString(),
								s.totalLateFeeAmount().toPlainString(),
								s.totalNetPayableAmount().toPlainString(),
								s.totalPaidAmount().toPlainString(),
								s.totalOutstandingAmount().toPlainString(),
								s.totalOverdueAmount().toPlainString()))
						.toList();
				Map<String, String> totals = new LinkedHashMap<>();
				totals.put("Total Fees Demanded", rep.totalFeesDemanded().toPlainString());
				totals.put("Total Collected", rep.totalAmountCollected().toPlainString());
				totals.put("Total Refunded", rep.totalRefundedAmount().toPlainString());
				totals.put("Total Concessions", rep.totalConcessionAmount().toPlainString());
				totals.put("Total Outstanding", rep.totalOutstandingAmount().toPlainString());
				totals.put("Total Overdue", rep.totalOverdueAmount().toPlainString());
				yield exportGenerator.generate(
						fmt, "financial_report", org.getName(), "Fees & Financial Report",
						rep.filters().academicSessionName(), rep.filters().startDate(), rep.filters().endDate(),
						headers, rows, totals);
			}
			case "student-fee-statement" -> {
				if (!canViewFinancials()) {
					throw new AccessDeniedException("User does not have permission to export student fee statements");
				}
				if (studentId == null) {
					throw new IllegalArgumentException("studentId is required for student-fee-statement export");
				}
				AcademicSession session = resolveSessionOptional(orgId, academicSessionId, sessionScope);
				if (session == null) {
					throw new EntityNotFoundException("Academic session not found for student fee statement");
				}
				StudentFinancialProfileResponse profile = feeManagementService.getStudentFinancialProfile(
						orgId, studentId, session.getId());
				List<StudentFeeDemandResponse> allDemands = new ArrayList<>(profile.monthlyDemands());
				allDemands.addAll(profile.yearlyAndOneTimeDemands());
				List<String> headers = List.of(
						"Component", "Frequency", "Period", "Due Date", "Base", "Concession",
						"Late Fee", "Net Payable", "Paid", "Outstanding", "Status");
				List<List<String>> rows = allDemands.stream()
						.map(d -> List.of(
								nullToEmpty(d.componentName()),
								d.frequency() != null ? d.frequency().name() : "",
								nullToEmpty(d.periodLabel()),
								d.dueDate() != null ? d.dueDate().toString() : "",
								d.baseAmount().toPlainString(),
								d.concessionAmount().toPlainString(),
								d.lateFeeAmount().toPlainString(),
								d.netPayableAmount().toPlainString(),
								d.paidAmount().toPlainString(),
								d.outstandingAmount().toPlainString(),
								d.status() != null ? d.status().name() : ""))
						.toList();
				Map<String, String> totals = new LinkedHashMap<>();
				totals.put("Student", profile.studentName() + " (" + profile.admissionNumber() + ")");
				totals.put("Total Net Payable", profile.totalNetPayableFees().toPlainString());
				totals.put("Total Paid", profile.totalPaidAmount().toPlainString());
				totals.put("Unapplied Credit", profile.unappliedAccountCredit().toPlainString());
				totals.put("Total Outstanding", profile.totalOutstandingBalance().toPlainString());
				yield exportGenerator.generate(
						fmt, "student_fee_statement_" + profile.admissionNumber(), org.getName(),
						"Student Fee Statement - " + profile.studentName(),
						profile.academicSessionName(), null, null, headers, rows, totals);
			}
			default -> throw new IllegalArgumentException("Unsupported report export type: " + reportType);
		};
	}

	private boolean isSchoolAdminOrPrincipal() {
		return currentUser.hasPermission(PermissionCode.SCHOOL_UPDATE.getValue())
				|| currentUser.hasPermission(PermissionCode.CLASS_MANAGE.getValue())
				|| currentUser.hasPermission(PermissionCode.STAFF_MANAGE.getValue())
				|| currentUser.hasPermission(PermissionCode.ACADEMIC_SESSION_MANAGE.getValue());
	}

	private boolean canViewFinancials() {
		return currentUser.hasPermission(PermissionCode.FEES_VIEW.getValue())
				|| currentUser.hasPermission(PermissionCode.FEES_REPORT_VIEW.getValue());
	}

	private AcademicSession resolveSessionOptional(
			Long orgId, Long academicSessionId, AcademicSessionScope sessionScope) {
		if (academicSessionId != null) {
			return sessionService.requireSession(orgId, academicSessionId);
		}
		if (sessionScope == AcademicSessionScope.PREVIOUS) {
			List<AcademicSession> completed = sessionRepository
					.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(orgId, AcademicSessionStatus.COMPLETED);
			return completed.isEmpty() ? null : completed.getFirst();
		}
		List<AcademicSession> active = sessionRepository
				.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(orgId, AcademicSessionStatus.ACTIVE);
		if (!active.isEmpty()) {
			return active.getFirst();
		}
		List<AcademicSession> all = sessionRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		return all.isEmpty() ? null : all.getFirst();
	}

	private LocalDate[] resolveDateRange(
			Organization org, AcademicSession session, DateRangePreset preset,
			LocalDate startDate, LocalDate endDate, String selectedMonth) {
		LocalDate today = LocalDate.now(validator.resolveZoneId(org));
		DateRangePreset effective = preset != null ? preset
				: (startDate != null || endDate != null ? DateRangePreset.CUSTOM
						: (selectedMonth != null && !selectedMonth.isBlank() ? DateRangePreset.SELECTED_MONTH : DateRangePreset.SESSION));

		return switch (effective) {
			case TODAY -> new LocalDate[]{today, today};
			case THIS_WEEK -> new LocalDate[]{
					today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
					today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
			};
			case THIS_MONTH -> {
				YearMonth ym = YearMonth.from(today);
				yield new LocalDate[]{ym.atDay(1), ym.atEndOfMonth()};
			}
			case SELECTED_MONTH -> {
				YearMonth ym = (selectedMonth == null || selectedMonth.isBlank())
						? YearMonth.from(today)
						: YearMonth.parse(selectedMonth.trim());
				yield new LocalDate[]{ym.atDay(1), ym.atEndOfMonth()};
			}
			case CUSTOM -> {
				if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
					throw new IllegalArgumentException("End date cannot be earlier than start date");
				}
				yield new LocalDate[]{startDate, endDate};
			}
			case SESSION -> session == null
					? new LocalDate[]{null, null}
					: new LocalDate[]{session.getStartDate(), session.getEndDate()};
		};
	}

	private boolean isWithinRange(LocalDate date, LocalDate start, LocalDate end) {
		if (date == null) {
			return false;
		}
		if (start != null && date.isBefore(start)) {
			return false;
		}
		if (end != null && date.isAfter(end)) {
			return false;
		}
		return true;
	}
	private TeacherProfile resolveTargetTeacher(Long orgId, Long requestedTeacherId) {
		boolean canManageTeachers = currentUser.hasPermission(PermissionCode.TEACHER_MANAGE.getValue())
				|| isSchoolAdminOrPrincipal();
		Optional<Staff> ownStaff = currentUser.getUserId() == null ? Optional.empty()
				: staffRepository.findByOrganizationIdAndUserId(orgId, currentUser.getUserId());
		Optional<TeacherProfile> ownTeacher = ownStaff.flatMap(
				s -> teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, s.getId()));

		if (requestedTeacherId != null) {
			if (!canManageTeachers) {
				if (ownTeacher.isEmpty() || !ownTeacher.get().getId().equals(requestedTeacherId)) {
					throw new AccessDeniedException("Teachers can only view their own dashboard and assigned classes");
				}
			}
			return teacherProfileRepository.findByIdAndOrganizationId(requestedTeacherId, orgId)
					.orElseThrow(() -> new EntityNotFoundException("Teacher profile not found"));
		}
		if (ownTeacher.isPresent()) {
			return ownTeacher.get();
		}
		throw new EntityNotFoundException("No teacher profile linked to current user; specify teacherId");
	}

	private Set<Long> resolveTeacherRestrictedClassIds(Long orgId, Long sessionId, Long requestedClassId) {
		if (isSchoolAdminOrPrincipal()
				|| currentUser.hasPermission(PermissionCode.FEES_REPORT_VIEW.getValue())
				|| currentUser.hasPermission(PermissionCode.STUDENT_CREATE.getValue())) {
			return null;
		}
		Optional<Staff> ownStaff = currentUser.getUserId() == null ? Optional.empty()
				: staffRepository.findByOrganizationIdAndUserId(orgId, currentUser.getUserId());
		Optional<TeacherProfile> ownTeacher = ownStaff.flatMap(
				s -> teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, s.getId()));
		if (ownTeacher.isEmpty()) {
			return Set.of();
		}
		Long teacherId = ownTeacher.get().getId();
		Set<Long> allowed = new LinkedHashSet<>();
		if (sessionId != null) {
			teacherClassAssignmentRepository.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAsc(
					orgId, teacherId, sessionId).forEach(ca -> allowed.add(ca.getClassId()));
			teacherSubjectAssignmentRepository.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAscSubjectIdAsc(
					orgId, teacherId, sessionId).forEach(sa -> allowed.add(sa.getClassId()));
		} else {
			teacherClassAssignmentRepository.findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescClassIdAsc(
					orgId, teacherId).forEach(ca -> allowed.add(ca.getClassId()));
			teacherSubjectAssignmentRepository.findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescClassIdAscSubjectIdAsc(
					orgId, teacherId).forEach(sa -> allowed.add(sa.getClassId()));
		}
		if (requestedClassId != null && !allowed.contains(requestedClassId)) {
			throw new AccessDeniedException("Teacher is not assigned to the requested class");
		}
		return allowed;
	}
	private DailyAttendanceSnapshot buildDailyStudentAttendanceSnapshot(
			Long orgId, Long sessionId, LocalDate date, Set<Long> filterClassIds) {
		if (sessionId == null) {
			return new DailyAttendanceSnapshot(date, 0, 0, 0, 0, 0, 0, 0, 0, 0.0);
		}
		int totalEnrolled = (int) enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(orgId, sessionId)
				.stream()
				.filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
				.filter(e -> filterClassIds == null || filterClassIds.contains(e.getClassId()))
				.count();
		List<StudentAttendance> rows = studentAttendanceRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByAttendanceDateDescStudentIdAsc(orgId, sessionId)
				.stream()
				.filter(r -> r.getAttendanceDate().equals(date))
				.filter(r -> filterClassIds == null || filterClassIds.contains(r.getClassId()))
				.toList();
		return computeStudentDailySnapshot(date, totalEnrolled, rows);
	}

	private DailyAttendanceSnapshot computeStudentDailySnapshot(
			LocalDate date, int totalCount, List<StudentAttendance> rows) {
		int present = 0, absent = 0, late = 0, halfDay = 0, excused = 0, holiday = 0;
		for (StudentAttendance r : rows) {
			switch (r.getStatus()) {
				case PRESENT -> present++;
				case ABSENT -> absent++;
				case LATE -> late++;
				case HALF_DAY -> halfDay++;
				case EXCUSED -> excused++;
				case HOLIDAY -> holiday++;
			}
		}
		int applicable = present + late + halfDay + absent;
		double weighted = present + late + (halfDay * 0.5);
		double pct = applicable == 0 ? 0.0 : round2((weighted * 100.0) / applicable);
		return new DailyAttendanceSnapshot(
				date, totalCount, rows.size(), present, absent, late, halfDay, excused, holiday, pct);
	}

	private DailyAttendanceSnapshot buildDailyStaffAttendanceSnapshot(Long orgId, LocalDate date, int totalActiveStaff) {
		List<StaffAttendance> rows = staffAttendanceRepository
				.findAllByOrganizationIdAndAttendanceDateOrderByStaffIdAsc(orgId, date);
		int present = 0, absent = 0, late = 0, halfDay = 0, onLeave = 0, holiday = 0;
		for (StaffAttendance r : rows) {
			switch (r.getStatus()) {
				case PRESENT -> present++;
				case ABSENT -> absent++;
				case LATE -> late++;
				case HALF_DAY -> halfDay++;
				case ON_LEAVE -> onLeave++;
				case HOLIDAY -> holiday++;
			}
		}
		int applicable = present + late + halfDay + absent + onLeave;
		double weighted = present + late + (halfDay * 0.5);
		double pct = applicable == 0 ? 0.0 : round2((weighted * 100.0) / applicable);
		return new DailyAttendanceSnapshot(
				date, totalActiveStaff, rows.size(), present, absent, late, halfDay, onLeave, holiday, pct);
	}

	private double computeSessionStudentAttendancePercentage(
			Long orgId, Long sessionId, Long classId, LocalDate start, LocalDate end) {
		List<StudentAttendance> rows = classId == null
				? studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByAttendanceDateDescStudentIdAsc(orgId, sessionId)
				: studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByAttendanceDateDescStudentIdAsc(orgId, sessionId, classId);
		int present = 0, late = 0, halfDay = 0, absent = 0;
		for (StudentAttendance r : rows) {
			if (isWithinRange(r.getAttendanceDate(), start, end)) {
				switch (r.getStatus()) {
					case PRESENT -> present++;
					case LATE -> late++;
					case HALF_DAY -> halfDay++;
					case ABSENT -> absent++;
					default -> {
					}
				}
			}
		}
		int applicable = present + late + halfDay + absent;
		return applicable == 0 ? 0.0 : round2(((present + late + (halfDay * 0.5)) * 100.0) / applicable);
	}

	private double computeOverallStaffAttendancePercentage(Long orgId, LocalDate start, LocalDate end) {
		LocalDate from = start != null ? start : LocalDate.of(2000, 1, 1);
		LocalDate to = end != null ? end : LocalDate.of(2100, 12, 31);
		List<StaffAttendance> rows = staffAttendanceRepository
				.findAllByOrganizationIdAndAttendanceDateBetweenOrderByAttendanceDateAscStaffIdAsc(orgId, from, to);
		int present = 0, late = 0, halfDay = 0, absent = 0, onLeave = 0;
		for (StaffAttendance r : rows) {
			switch (r.getStatus()) {
				case PRESENT -> present++;
				case LATE -> late++;
				case HALF_DAY -> halfDay++;
				case ABSENT -> absent++;
				case ON_LEAVE -> onLeave++;
				default -> {
				}
			}
		}
		int applicable = present + late + halfDay + absent + onLeave;
		return applicable == 0 ? 0.0 : round2(((present + late + (halfDay * 0.5)) * 100.0) / applicable);
	}
	private List<ClassStrengthAndAttendanceItem> buildClassStrengthAndAttendanceItems(
			Long orgId, Long sessionId, List<SchoolClass> classes) {
		List<StudentEnrollment> enrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(orgId, sessionId);
		Map<Long, Long> activeCountByClass = enrollments.stream()
				.filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
				.collect(Collectors.groupingBy(StudentEnrollment::getClassId, Collectors.counting()));

		List<Examination> officialExams = examinationRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(orgId, sessionId).stream()
				.filter(this::isOfficialExamForCaller).toList();
		Map<Long, List<BigDecimal>> examPctByClass = new HashMap<>();
		for (Examination ex : officialExams) {
			for (StudentExamResult r : examResultRepository.findAllByOrganizationIdAndExaminationIdOrderByPercentageDescStudentIdAsc(orgId, ex.getId())) {
				examPctByClass.computeIfAbsent(ex.getClassId(), k -> new ArrayList<>()).add(r.getPercentage());
			}
		}

		List<ClassStrengthAndAttendanceItem> items = new ArrayList<>();
		for (SchoolClass sc : classes) {
			int strength = activeCountByClass.getOrDefault(sc.getId(), 0L).intValue();
			double attPct = computeSessionStudentAttendancePercentage(orgId, sessionId, sc.getId(), null, null);
			List<BigDecimal> pcts = examPctByClass.getOrDefault(sc.getId(), List.of());
			BigDecimal avgAcad = pcts.isEmpty() ? zero()
					: pcts.stream().reduce(zero(), BigDecimal::add)
							.divide(BigDecimal.valueOf(pcts.size()), 2, RoundingMode.HALF_UP);
			items.add(new ClassStrengthAndAttendanceItem(
					sc.getId(), sc.getCode(), sc.getName(), strength, attPct, avgAcad));
		}
		return items;
	}

	private List<LowAttendanceStudentItem> buildLowAttendanceStudents(
			Long orgId, Long sessionId, List<SchoolClass> classes,
			double threshold, LocalDate start, LocalDate end) {
		Map<Long, SchoolClass> classMap = classes.stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));
		Map<Long, StudentEnrollment> enrollmentByStudent = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(orgId, sessionId).stream()
				.collect(Collectors.toMap(StudentEnrollment::getStudentId, Function.identity(), (a, b) -> a));

		List<StudentAttendance> rows = studentAttendanceRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByAttendanceDateDescStudentIdAsc(orgId, sessionId)
				.stream()
				.filter(r -> classMap.containsKey(r.getClassId()))
				.filter(r -> isWithinRange(r.getAttendanceDate(), start, end))
				.toList();

		Map<Long, List<StudentAttendance>> byStudent = rows.stream()
				.collect(Collectors.groupingBy(StudentAttendance::getStudentId, LinkedHashMap::new, Collectors.toList()));

		List<LowAttendanceStudentItem> result = new ArrayList<>();
		for (Map.Entry<Long, List<StudentAttendance>> entry : byStudent.entrySet()) {
			Student st = studentMap.get(entry.getKey());
			StudentAttendanceSummaryResponse sum = calculateStudentSummary(st, entry.getValue());
			if (sum.applicableWorkingDays() > 0 && sum.attendancePercentage() < threshold) {
				StudentEnrollment enr = enrollmentByStudent.get(entry.getKey());
				Long cId = enr != null ? enr.getClassId() : entry.getValue().getFirst().getClassId();
				SchoolClass sc = classMap.get(cId);
				result.add(new LowAttendanceStudentItem(
						entry.getKey(), sum.admissionNumber(), sum.studentName(),
						cId, sc != null ? sc.getName() : "",
						sum.applicableWorkingDays(), sum.presentCount(), sum.absentCount(),
						sum.lateCount(), sum.attendancePercentage()));
			}
		}
		result.sort(Comparator.comparingDouble(LowAttendanceStudentItem::attendancePercentage));
		return result;
	}
	private List<UpcomingExaminationSummary> buildUpcomingExaminations(
			Long orgId, Long sessionId, LocalDate refDate, Set<Long> filterClassIds) {
		Map<Long, SchoolClass> classMap = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		return examinationRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(orgId, sessionId)
				.stream()
				.filter(e -> filterClassIds == null || filterClassIds.contains(e.getClassId()))
				.filter(e -> e.getStatus() == ExaminationStatus.SCHEDULED
						|| e.getStatus() == ExaminationStatus.IN_PROGRESS
						|| (e.getEndDate() != null && !e.getEndDate().isBefore(refDate)))
				.map(e -> {
					SchoolClass sc = classMap.get(e.getClassId());
					int subjCount = examScheduleRepository
							.findAllByOrganizationIdAndExaminationIdOrderByExamDateAscStartTimeAsc(orgId, e.getId()).size();
					return new UpcomingExaminationSummary(
							e.getId(), e.getName(), e.getExamType(), e.getStatus(),
							e.getClassId(), sc != null ? sc.getName() : "",
							e.getStartDate(), e.getEndDate(), subjCount);
				})
				.toList();
	}

	private List<PublishedExamResultOverview> buildPublishedExamResultOverviews(
			Long orgId, Long sessionId, Long filterClassId, boolean includeDrafts) {
		Map<Long, SchoolClass> classMap = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		return examinationRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(orgId, sessionId)
				.stream()
				.filter(e -> filterClassId == null || e.getClassId().equals(filterClassId))
				.filter(e -> includeDrafts || isOfficialExamForCaller(e))
				.map(e -> {
					List<StudentExamResult> res = examResultRepository
							.findAllByOrganizationIdAndExaminationIdOrderByPercentageDescStudentIdAsc(orgId, e.getId());
					int pass = (int) res.stream().filter(StudentExamResult::isOverallPassed).count();
					int fail = res.size() - pass;
					double passPct = res.isEmpty() ? 0.0 : round2((pass * 100.0) / res.size());
					BigDecimal avg = res.isEmpty() ? zero()
							: res.stream().map(StudentExamResult::getPercentage)
									.reduce(zero(), BigDecimal::add)
									.divide(BigDecimal.valueOf(res.size()), 2, RoundingMode.HALF_UP);
					SchoolClass sc = classMap.get(e.getClassId());
					return new PublishedExamResultOverview(
							e.getId(), e.getName(), e.getExamType(), e.getStatus(),
							isOfficialStatus(e.getStatus()), e.getClassId(), sc != null ? sc.getName() : "",
							res.size(), pass, fail, passPct, avg, e.getPublishedAt());
				})
				.toList();
	}

	private List<StudentAcademicAttentionItem> buildStudentsRequiringAcademicAttention(
			Long orgId, Long sessionId, Long filterClassId, double threshold) {
		Map<Long, SchoolClass> classMap = classRepository.findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(orgId).stream()
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));
		List<Examination> officialExams = examinationRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByStartDateAscIdAsc(orgId, sessionId).stream()
				.filter(e -> filterClassId == null || e.getClassId().equals(filterClassId))
				.filter(this::isOfficialExamForCaller)
				.toList();

		List<StudentAcademicAttentionItem> items = new ArrayList<>();
		BigDecimal minPct = BigDecimal.valueOf(threshold);
		for (Examination ex : officialExams) {
			SchoolClass sc = classMap.get(ex.getClassId());
			String className = sc != null ? sc.getName() : "";
			for (StudentExamResult r : examResultRepository.findAllByOrganizationIdAndExaminationIdOrderByPercentageDescStudentIdAsc(orgId, ex.getId())) {
				if (!r.isOverallPassed() || r.getPercentage().compareTo(minPct) < 0) {
					Student st = studentMap.get(r.getStudentId());
					String reason = !r.isOverallPassed()
							? "Failed examination (" + r.getOverallGrade() + ")"
							: "Percentage below attention threshold (" + r.getPercentage() + "% < " + threshold + "%)";
					items.add(new StudentAcademicAttentionItem(
							r.getStudentId(), st != null ? st.getAdmissionNumber() : null, fullName(st),
							ex.getClassId(), className, ex.getId(), ex.getName(),
							r.getPercentage(), r.getOverallGrade(), r.isOverallPassed(), reason));
				}
			}
		}
		return items;
	}
	private FinancialOverviewSnapshot buildFinancialOverviewSnapshot(Long orgId, Long sessionId) {
		SessionFeeDashboardReportResponse dash = feeManagementService.getSessionFeeDashboardReport(orgId, sessionId);
		return new FinancialOverviewSnapshot(
				dash.totalNetFeesExpected(),
				dash.totalExpectedBaseFees(),
				dash.totalConcessionsAndWaivers(),
				dash.totalLateFees(),
				dash.totalCollectedAmount(),
				dash.totalRefundedAmount(),
				dash.totalUnappliedAccountCredit(),
				dash.totalOutstandingFees(),
				dash.totalOverdueFees()
		);
	}

	private ConcessionWaiverSummary buildConcessionWaiverSummary(Long orgId, Long sessionId, Long filterStudentId) {
		List<StudentFeeConcession> rules = feeConcessionRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByIdAsc(orgId, sessionId).stream()
				.filter(StudentFeeConcession::isActive)
				.filter(c -> filterStudentId == null || c.getStudentId().equals(filterStudentId))
				.toList();
		Set<Long> studentsWithConc = rules.stream().map(StudentFeeConcession::getStudentId).collect(Collectors.toSet());

		List<StudentFeeDemand> demands = feeDemandRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscStudentIdAscDueDateAscIdAsc(orgId, sessionId)
				.stream()
				.filter(d -> d.getStatus() != FeeDemandStatus.CANCELLED)
				.filter(d -> filterStudentId == null || d.getStudentId().equals(filterStudentId))
				.toList();

		int waivedCount = 0;
		BigDecimal totalConcAmt = zero();
		for (StudentFeeDemand d : demands) {
			if (d.getStatus() == FeeDemandStatus.WAIVED) {
				waivedCount++;
			}
			if (d.getConcessionAmount().compareTo(BigDecimal.ZERO) > 0) {
				studentsWithConc.add(d.getStudentId());
				totalConcAmt = totalConcAmt.add(d.getConcessionAmount());
			}
		}

		Map<String, BigDecimal> byType = new LinkedHashMap<>();
		for (ConcessionType ct : ConcessionType.values()) {
			byType.put(ct.name(), zero());
		}
		Map<Long, ConcessionType> studentPrimaryType = rules.stream()
				.collect(Collectors.toMap(StudentFeeConcession::getStudentId, StudentFeeConcession::getConcessionType, (a, b) -> a));
		for (StudentFeeDemand d : demands) {
			if (d.getConcessionAmount().compareTo(BigDecimal.ZERO) > 0) {
				ConcessionType ct = d.getStatus() == FeeDemandStatus.WAIVED
						? ConcessionType.FULL_WAIVER
						: studentPrimaryType.getOrDefault(d.getStudentId(), ConcessionType.FIXED_AMOUNT);
				byType.put(ct.name(), byType.getOrDefault(ct.name(), zero()).add(d.getConcessionAmount()));
			}
		}

		return new ConcessionWaiverSummary(
				rules.size(), studentsWithConc.size(), waivedCount, totalConcAmt, byType);
	}

	private List<SchoolActivityItem> buildRecentActivities(Long orgId, Long sessionId) {
		List<SchoolActivityItem> items = new ArrayList<>();
		if (canViewFinancials()) {
			for (FeeAuditLog log : feeAuditLogRepository.findTop20ByOrganizationIdOrderByPerformedAtDescIdDesc(orgId)) {
				items.add(new SchoolActivityItem(
						log.getAction(), "FEES",
						log.getEntityType() + " #" + log.getEntityId() + ": " + nullToEmpty(log.getReason()),
						log.getPerformedAt(), log.getPerformedBy()));
			}
		}
		if (currentUser.hasPermission(PermissionCode.ATTENDANCE_VIEW.getValue())) {
			for (AttendanceAuditLog log : attendanceAuditLogRepository.findTop20ByOrganizationIdOrderByChangedAtDesc(orgId)) {
				items.add(new SchoolActivityItem(
						"ATTENDANCE_CORRECTION", "ATTENDANCE",
						log.getTargetType() + " attendance updated from " + log.getPreviousStatus() + " to " + log.getNewStatus(),
						log.getChangedAt(), log.getChangedBy()));
			}
		}
		items.sort(Comparator.comparing(SchoolActivityItem::occurredAt, Comparator.nullsLast(Comparator.reverseOrder())));
		return items.stream().limit(15).toList();
	}
	private List<String> detectMissingProfileFields(Student s, boolean hasGuardian) {
		List<String> missing = new ArrayList<>();
		if (!hasGuardian) {
			missing.add("guardian");
		}
		if (s.getPhoneNumber() == null || s.getPhoneNumber().isBlank()) {
			missing.add("phoneNumber");
		}
		if (s.getEmail() == null || s.getEmail().isBlank()) {
			missing.add("email");
		}
		if (s.getAddress() == null || s.getAddress().isBlank()) {
			missing.add("address");
		}
		if (s.getPostalCode() == null || s.getPostalCode().isBlank()) {
			missing.add("postalCode");
		}
		if (s.getBloodGroup() == null || s.getBloodGroup().isBlank()) {
			missing.add("bloodGroup");
		}
		return missing;
	}

	private StudentReportRecordItem toStudentReportRecordItem(
			Student s, StudentEnrollment enr, SchoolClass sc, List<String> missing) {
		return new StudentReportRecordItem(
				s.getId(), s.getAdmissionNumber(), fullName(s),
				s.getGender(), s.getDateOfBirth(), s.getAdmissionDate(), s.getStatus(),
				enr != null ? enr.getId() : null,
				enr != null ? enr.getClassId() : null,
				sc != null ? sc.getName() : null,
				enr != null ? enr.getRollNumber() : null,
				enr != null ? enr.getEnrollmentDate() : null,
				enr != null ? enr.getStatus() : null,
				enr != null ? enr.getRemarks() : null,
				missing
		);
	}

	private List<ClassStudentCountItem> buildClassStudentCounts(
			List<SchoolClass> classes, List<StudentEnrollment> enrollments,
			Long filterClassId, Set<Long> teacherScopedClassIds) {
		Map<Long, List<StudentEnrollment>> byClass = enrollments.stream()
				.collect(Collectors.groupingBy(StudentEnrollment::getClassId));
		List<ClassStudentCountItem> items = new ArrayList<>();
		for (SchoolClass sc : classes) {
			if (filterClassId != null && !sc.getId().equals(filterClassId)) {
				continue;
			}
			if (teacherScopedClassIds != null && !teacherScopedClassIds.contains(sc.getId())) {
				continue;
			}
			List<StudentEnrollment> list = byClass.getOrDefault(sc.getId(), List.of());
			int active = (int) list.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).count();
			int other = list.size() - active;
			items.add(new ClassStudentCountItem(sc.getId(), sc.getCode(), sc.getName(), active, other, list.size()));
		}
		return items;
	}

	private List<SessionEnrollmentCountItem> buildSessionEnrollmentCounts(Long orgId) {
		List<AcademicSession> sessions = sessionRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		List<StudentEnrollment> allEnrollments = enrollmentRepository
				.findAllByOrganizationIdOrderByAcademicSessionIdDescClassIdAscIdAsc(orgId);
		Map<Long, List<StudentEnrollment>> bySession = allEnrollments.stream()
				.collect(Collectors.groupingBy(StudentEnrollment::getAcademicSessionId));

		List<SessionEnrollmentCountItem> items = new ArrayList<>();
		for (AcademicSession sess : sessions) {
			List<StudentEnrollment> list = bySession.getOrDefault(sess.getId(), List.of());
			int active = (int) list.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).count();
			int trans = (int) list.stream().filter(e -> e.getStatus() == EnrollmentStatus.TRANSFERRED).count();
			int withd = (int) list.stream().filter(e -> e.getStatus() == EnrollmentStatus.WITHDRAWN
					|| e.getStatus() == EnrollmentStatus.DROPPED).count();
			int comp = (int) list.stream().filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED).count();
			items.add(new SessionEnrollmentCountItem(
					sess.getId(), sess.getName(), active, trans, withd, comp, list.size()));
		}
		return items;
	}

	private List<MonthlyAttendanceTrendItem> buildMonthlyAttendanceTrends(List<StudentAttendance> rows) {
		Map<String, List<StudentAttendance>> byMonth = rows.stream()
				.collect(Collectors.groupingBy(
						r -> YearMonth.from(r.getAttendanceDate()).toString(),
						TreeMap::new, Collectors.toList()));
		List<MonthlyAttendanceTrendItem> items = new ArrayList<>();
		for (Map.Entry<String, List<StudentAttendance>> e : byMonth.entrySet()) {
			int present = 0, absent = 0, late = 0, halfDay = 0;
			for (StudentAttendance r : e.getValue()) {
				switch (r.getStatus()) {
					case PRESENT -> present++;
					case ABSENT -> absent++;
					case LATE -> late++;
					case HALF_DAY -> halfDay++;
					default -> {
					}
				}
			}
			int applicable = present + absent + late + halfDay;
			double pct = applicable == 0 ? 0.0 : round2(((present + late + (halfDay * 0.5)) * 100.0) / applicable);
			items.add(new MonthlyAttendanceTrendItem(
					e.getKey(), e.getValue().size(), applicable, present, absent, late, halfDay, pct));
		}
		return items;
	}
	private List<ClassAttendancePercentageItem> buildClassAttendancePercentageItems(
			Long orgId, Long sessionId, List<SchoolClass> classes, List<StudentAttendance> rows) {
		Map<Long, List<StudentAttendance>> byClass = rows.stream()
				.collect(Collectors.groupingBy(StudentAttendance::getClassId));
		Map<Long, Long> enrolledByClass = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(orgId, sessionId).stream()
				.filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
				.collect(Collectors.groupingBy(StudentEnrollment::getClassId, Collectors.counting()));

		List<ClassAttendancePercentageItem> items = new ArrayList<>();
		for (SchoolClass sc : classes) {
			List<StudentAttendance> cRows = byClass.getOrDefault(sc.getId(), List.of());
			int present = 0, absent = 0, late = 0, halfDay = 0;
			for (StudentAttendance r : cRows) {
				switch (r.getStatus()) {
					case PRESENT -> present++;
					case ABSENT -> absent++;
					case LATE -> late++;
					case HALF_DAY -> halfDay++;
					default -> {
					}
				}
			}
			int applicable = present + absent + late + halfDay;
			double pct = applicable == 0 ? 0.0 : round2(((present + late + (halfDay * 0.5)) * 100.0) / applicable);
			items.add(new ClassAttendancePercentageItem(
					sc.getId(), sc.getCode(), sc.getName(),
					enrolledByClass.getOrDefault(sc.getId(), 0L).intValue(),
					applicable, present, absent, late, halfDay, pct));
		}
		return items;
	}

	private StudentAttendanceSummaryResponse calculateStudentSummary(
			Student student, List<StudentAttendance> rows) {
		int holiday = 0, excused = 0, present = 0, late = 0, halfDay = 0, absent = 0;
		for (StudentAttendance r : rows) {
			switch (r.getStatus()) {
				case HOLIDAY -> holiday++;
				case EXCUSED -> excused++;
				case PRESENT -> present++;
				case LATE -> late++;
				case HALF_DAY -> halfDay++;
				case ABSENT -> absent++;
			}
		}
		int applicable = present + late + halfDay + absent;
		double weighted = present + late + (halfDay * 0.5);
		double pct = applicable == 0 ? 0.0 : round2((weighted * 100.0) / applicable);
		return new StudentAttendanceSummaryResponse(
				student != null ? student.getId() : null,
				student != null ? student.getAdmissionNumber() : null,
				fullName(student), rows.size(), holiday, excused, applicable,
				present, late, halfDay, absent, pct);
	}

	private StudentAttendanceResponse toStudentAttendanceResponse(
			StudentAttendance r, SchoolClass sc, Student st) {
		return new StudentAttendanceResponse(
				r.getId(), r.getOrganizationId(), r.getAcademicSessionId(),
				r.getClassId(), sc != null ? sc.getName() : null,
				r.getEnrollmentId(), r.getStudentId(),
				st != null ? st.getAdmissionNumber() : null,
				st != null ? st.getFirstName() : null,
				st != null ? st.getLastName() : null,
				r.getAttendanceDate(), r.getStatus(), r.getMarkedBy(),
				r.getUpdatedBy(), r.getRemarks(), r.getCreatedAt(), r.getUpdatedAt());
	}

	private List<DailyAttendanceSnapshot> buildDailyTrendsFromRows(List<StudentAttendance> rows) {
		Map<LocalDate, List<StudentAttendance>> byDate = rows.stream()
				.collect(Collectors.groupingBy(StudentAttendance::getAttendanceDate, TreeMap::new, Collectors.toList()));
		return byDate.entrySet().stream()
				.map(e -> computeStudentDailySnapshot(e.getKey(), e.getValue().size(), e.getValue()))
				.toList();
	}

	private List<StaffAttendanceSummaryResponse> buildStaffAttendanceSummaries(
			Long orgId, List<Staff> allStaff, Long filterStaffId, LocalDate start, LocalDate end) {
		LocalDate from = start != null ? start : LocalDate.of(2000, 1, 1);
		LocalDate to = end != null ? end : LocalDate.of(2100, 12, 31);
		List<StaffAttendance> rows = filterStaffId == null
				? staffAttendanceRepository.findAllByOrganizationIdAndAttendanceDateBetweenOrderByAttendanceDateAscStaffIdAsc(orgId, from, to)
				: staffAttendanceRepository.findAllByOrganizationIdAndStaffIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(orgId, filterStaffId, from, to);

		Map<Long, List<StaffAttendance>> byStaff = rows.stream()
				.collect(Collectors.groupingBy(StaffAttendance::getStaffId));
		List<StaffAttendanceSummaryResponse> summaries = new ArrayList<>();
		for (Staff st : allStaff) {
			if (filterStaffId != null && !st.getId().equals(filterStaffId)) {
				continue;
			}
			List<StaffAttendance> sRows = byStaff.getOrDefault(st.getId(), List.of());
			if (sRows.isEmpty() && filterStaffId == null) {
				continue;
			}
			int holiday = 0, present = 0, late = 0, halfDay = 0, absent = 0, onLeave = 0;
			for (StaffAttendance r : sRows) {
				switch (r.getStatus()) {
					case HOLIDAY -> holiday++;
					case PRESENT -> present++;
					case LATE -> late++;
					case HALF_DAY -> halfDay++;
					case ABSENT -> absent++;
					case ON_LEAVE -> onLeave++;
				}
			}
			int applicable = present + late + halfDay + absent + onLeave;
			double pct = applicable == 0 ? 0.0 : round2(((present + late + (halfDay * 0.5)) * 100.0) / applicable);
			String name = st.getFirstName() + (st.getLastName() != null ? " " + st.getLastName() : "");
			summaries.add(new StaffAttendanceSummaryResponse(
					st.getId(), st.getEmployeeId(), name,
					sRows.size(), holiday, applicable, present, late, halfDay, absent, onLeave, pct));
		}
		return summaries;
	}
	private boolean isOfficialStatus(ExaminationStatus st) {
		return st == ExaminationStatus.COMPLETED || st == ExaminationStatus.PUBLISHED;
	}

	private boolean isOfficialExamForCaller(Examination e) {
		if (e.getStatus() == ExaminationStatus.PUBLISHED) {
			return true;
		}
		if (e.getStatus() == ExaminationStatus.COMPLETED) {
			return currentUser.hasPermission(PermissionCode.EXAM_MANAGE.getValue())
					|| currentUser.hasPermission(PermissionCode.EXAM_PUBLISH_RESULTS.getValue());
		}
		return false;
	}

	private List<SubjectPerformanceSummaryItem> buildSubjectSummariesForExam(
			Long orgId, Examination exam, String className, Map<Long, Subject> subjectMap, Long filterStudentId) {
		List<ExamSchedule> schedules = examScheduleRepository
				.findAllByOrganizationIdAndExaminationIdOrderByExamDateAscStartTimeAsc(orgId, exam.getId());
		List<ExamMark> marks = examMarkRepository
				.findAllByOrganizationIdAndExaminationIdOrderBySubjectIdAscStudentIdAsc(orgId, exam.getId())
				.stream().filter(m -> filterStudentId == null || m.getStudentId().equals(filterStudentId)).toList();
		Map<Long, List<ExamMark>> bySubj = marks.stream()
				.collect(Collectors.groupingBy(ExamMark::getSubjectId));

		List<SubjectPerformanceSummaryItem> items = new ArrayList<>();
		for (ExamSchedule sch : schedules) {
			Subject subj = subjectMap.get(sch.getSubjectId());
			List<ExamMark> sMarks = bySubj.getOrDefault(sch.getSubjectId(), List.of());
			int eval = sMarks.size();
			int pass = (int) sMarks.stream().filter(ExamMark::isPassed).count();
			int fail = eval - pass;
			int absent = (int) sMarks.stream().filter(m -> m.getEntryStatus() == MarkEntryStatus.ABSENT).count();
			BigDecimal sumMarks = sMarks.stream()
					.map(m -> m.getMarksObtained() != null ? m.getMarksObtained() : zero())
					.reduce(zero(), BigDecimal::add);
			BigDecimal avgMarks = eval == 0 ? zero()
					: sumMarks.divide(BigDecimal.valueOf(eval), 2, RoundingMode.HALF_UP);
			BigDecimal avgPct = (eval == 0 || sch.getMaxMarks().compareTo(BigDecimal.ZERO) == 0) ? zero()
					: avgMarks.multiply(BigDecimal.valueOf(100)).divide(sch.getMaxMarks(), 2, RoundingMode.HALF_UP);
			double passPct = eval == 0 ? 0.0 : round2((pass * 100.0) / eval);

			items.add(new SubjectPerformanceSummaryItem(
					exam.getId(), exam.getName(), exam.getClassId(), className,
					sch.getSubjectId(), subj != null ? subj.getCode() : "", subj != null ? subj.getName() : "",
					sch.getMaxMarks(), sch.getPassingMarks(),
					eval, pass, fail, absent, avgMarks, avgPct, passPct));
		}
		return items;
	}

	private List<ClassAcademicPerformanceItem> buildClassAcademicPerformance(
			List<SchoolClass> classes,
			Map<Long, List<StudentExamResult>> officialResultsByClass,
			List<Examination> allExams) {
		Map<Long, Long> officialExamsCountByClass = allExams.stream()
				.filter(this::isOfficialExamForCaller)
				.collect(Collectors.groupingBy(Examination::getClassId, Collectors.counting()));
		List<ClassAcademicPerformanceItem> items = new ArrayList<>();
		for (SchoolClass sc : classes) {
			List<StudentExamResult> res = officialResultsByClass.getOrDefault(sc.getId(), List.of());
			int exCount = officialExamsCountByClass.getOrDefault(sc.getId(), 0L).intValue();
			if (res.isEmpty() && exCount == 0) {
				continue;
			}
			int pass = (int) res.stream().filter(StudentExamResult::isOverallPassed).count();
			int fail = res.size() - pass;
			double passPct = res.isEmpty() ? 0.0 : round2((pass * 100.0) / res.size());
			BigDecimal avg = res.isEmpty() ? zero()
					: res.stream().map(StudentExamResult::getPercentage)
							.reduce(zero(), BigDecimal::add)
							.divide(BigDecimal.valueOf(res.size()), 2, RoundingMode.HALF_UP);
			items.add(new ClassAcademicPerformanceItem(
					sc.getId(), sc.getCode(), sc.getName(), exCount, res.size(), pass, fail, passPct, avg));
		}
		return items;
	}

	private List<StudentFeeStatementSummaryItem> buildStudentStatementItems(
			Map<Long, List<StudentFeeDemand>> byStudent,
			List<FeePayment> allPayments,
			Map<Long, Student> studentMap,
			Map<Long, SchoolClass> classMap) {
		Map<Long, BigDecimal> creditByStudent = new HashMap<>();
		for (FeePayment p : allPayments) {
			if (p.getStatus() == PaymentStatus.COMPLETED || p.getStatus() == PaymentStatus.PARTIALLY_REFUNDED) {
				creditByStudent.merge(p.getStudentId(), p.getUnappliedCreditAmount(), BigDecimal::add);
			}
		}
		List<StudentFeeStatementSummaryItem> items = new ArrayList<>();
		for (Map.Entry<Long, List<StudentFeeDemand>> e : byStudent.entrySet()) {
			Long sId = e.getKey();
			List<StudentFeeDemand> dList = e.getValue();
			Student st = studentMap.get(sId);
			Long cId = dList.getFirst().getClassId();
			SchoolClass sc = classMap.get(cId);
			BigDecimal base = zero(), conc = zero(), late = zero(), net = zero(), paid = zero(), out = zero(), overdue = zero();
			int pendingCount = 0;
			for (StudentFeeDemand d : dList) {
				base = base.add(d.getBaseAmount());
				conc = conc.add(d.getConcessionAmount());
				late = late.add(d.getLateFeeAmount());
				net = net.add(d.getNetPayableAmount());
				paid = paid.add(d.getPaidAmount());
				out = out.add(d.getOutstandingAmount());
				if (d.getStatus() == FeeDemandStatus.OVERDUE) {
					overdue = overdue.add(d.getOutstandingAmount());
				}
				if (d.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0) {
					pendingCount++;
				}
			}
			items.add(new StudentFeeStatementSummaryItem(
					sId, st != null ? st.getAdmissionNumber() : null, fullName(st),
					cId, sc != null ? sc.getName() : "",
					base, conc, late, net, paid,
					creditByStudent.getOrDefault(sId, zero()),
					out, overdue, pendingCount));
		}
		return items;
	}
	private StudentFeeDemandResponse toDemandDto(StudentFeeDemand d, SchoolClass sc, Student st) {
		return new StudentFeeDemandResponse(
				d.getId(), d.getOrganizationId(), d.getAcademicSessionId(),
				d.getClassId(), sc != null ? sc.getName() : null,
				d.getEnrollmentId(), d.getStudentId(),
				st != null ? st.getAdmissionNumber() : null, fullName(st),
				d.getFeeStructureId(), d.getFeeStructureVersion(),
				d.getComponentId(), d.getComponentCode(), d.getComponentName(), d.getCategory(),
				d.getFrequency(), d.getBillingYear(), d.getBillingMonth(), d.getPeriodLabel(),
				d.getDueDate(), d.getBaseAmount(), d.getConcessionAmount(), d.getLateFeeAmount(),
				d.getNetPayableAmount(), d.getPaidAmount(), d.getOutstandingAmount(),
				d.getStatus(), d.getRemarks(), d.getCreatedAt(), d.getUpdatedAt());
	}

	private DateRangeCollectionSummary buildDateRangeCollectionSummary(
			List<FeePayment> allPayments, LocalDate start, LocalDate end) {
		Map<PaymentMethod, BigDecimal> byMethod = new EnumMap<>(PaymentMethod.class);
		for (PaymentMethod pm : PaymentMethod.values()) {
			byMethod.put(pm, zero());
		}
		int completedCount = 0, reversedOrRefundedCount = 0;
		BigDecimal gross = zero(), refunded = zero(), net = zero();
		for (FeePayment p : allPayments) {
			if (!isWithinRange(p.getPaymentDate(), start, end)) {
				continue;
			}
			refunded = refunded.add(p.getRefundedAmount());
			if (p.getStatus() == PaymentStatus.COMPLETED || p.getStatus() == PaymentStatus.PARTIALLY_REFUNDED) {
				completedCount++;
				gross = gross.add(p.getTotalAmount());
				BigDecimal netP = p.getTotalAmount().subtract(p.getRefundedAmount()).setScale(2, RoundingMode.HALF_UP);
				net = net.add(netP);
				byMethod.put(p.getPaymentMethod(), byMethod.get(p.getPaymentMethod()).add(netP));
			}
			if (p.getStatus() == PaymentStatus.REVERSED
					|| p.getStatus() == PaymentStatus.REFUNDED
					|| p.getStatus() == PaymentStatus.PARTIALLY_REFUNDED) {
				reversedOrRefundedCount++;
			}
		}
		return new DateRangeCollectionSummary(
				start, end, completedCount, reversedOrRefundedCount, gross, refunded, net, byMethod);
	}

	private List<ChartDatasetResponse> buildAdminCharts(
			Long orgId, AcademicSession session, List<SchoolClass> classes, FinancialOverviewSnapshot fin) {
		List<ChartDatasetResponse> charts = new ArrayList<>();
		if (session != null) {
			List<StudentEnrollment> enrs = enrollmentRepository
					.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(orgId, session.getId());
			List<ClassStudentCountItem> counts = buildClassStudentCounts(classes, enrs, null, null);
			List<ChartSeriesPoint> pts = counts.stream()
					.map(c -> new ChartSeriesPoint(c.className(), BigDecimal.valueOf(c.activeEnrolledCount()), null, "ENROLLMENT"))
					.toList();
			charts.add(makeChart("student_enrollment_by_class", "Student Enrollment Distribution by Class", "BAR", pts));
		}
		if (fin != null) {
			List<ChartSeriesPoint> fPts = List.of(
					new ChartSeriesPoint("Collected", fin.totalFeesCollected(), fin.totalFeesDemanded(), "FINANCE"),
					new ChartSeriesPoint("Outstanding", fin.outstandingFeeAmount(), fin.overdueFeeAmount(), "FINANCE"));
			charts.add(makeChart("fee_collection_vs_outstanding", "Fee Collection vs Outstanding Balance", "DONUT", fPts));
		}
		return charts;
	}

	private List<ChartDatasetResponse> buildPrincipalCharts(
			List<ClassStrengthAndAttendanceItem> classItems, List<PublishedExamResultOverview> examOverview) {
		List<ChartSeriesPoint> attPts = classItems.stream()
				.map(c -> new ChartSeriesPoint(c.className(), BigDecimal.valueOf(c.attendancePercentage()), BigDecimal.valueOf(c.activeStudentCount()), "ATTENDANCE"))
				.toList();
		List<ChartSeriesPoint> examPts = examOverview.stream()
				.map(e -> new ChartSeriesPoint(e.examinationName() + " (" + e.className() + ")", e.classAveragePercentage(), BigDecimal.valueOf(e.passPercentage()), "EXAM"))
				.toList();
		return List.of(
				makeChart("class_attendance_comparison", "Class-wise Attendance Comparison", "BAR", attPts),
				makeChart("class_academic_performance", "Examination Performance Comparison", "BAR", examPts));
	}
	private List<ChartDatasetResponse> buildAccountantCharts(SessionFeeDashboardReportResponse feeDash) {
		List<ChartSeriesPoint> mPts = feeDash.monthlyCollectionBreakdown().stream()
				.map(m -> new ChartSeriesPoint(m.periodLabel(), m.totalCollected(), m.totalDemanded(), "MONTHLY_FINANCE"))
				.toList();
		List<ChartSeriesPoint> cPts = List.of(
				new ChartSeriesPoint("Collected", feeDash.totalCollectedAmount(), feeDash.totalNetFeesExpected(), "FINANCE"),
				new ChartSeriesPoint("Outstanding", feeDash.totalOutstandingFees(), feeDash.totalOverdueFees(), "FINANCE"));
		return List.of(
				makeChart("monthly_fee_collection_trends", "Monthly Fee Collection Trends", "LINE", mPts),
				makeChart("fee_collection_vs_outstanding", "Fee Collection vs Outstanding Balance", "DONUT", cPts));
	}

	private List<ChartDatasetResponse> buildStudentEnrollmentCharts(
			List<ClassStudentCountItem> classCounts, Map<Gender, Integer> genderDist) {
		List<ChartSeriesPoint> cPts = classCounts.stream()
				.map(c -> new ChartSeriesPoint(c.className(), BigDecimal.valueOf(c.activeEnrolledCount()), BigDecimal.valueOf(c.totalEnrolledCount()), "CLASS"))
				.toList();
		List<ChartSeriesPoint> gPts = genderDist.entrySet().stream()
				.filter(e -> e.getValue() > 0)
				.map(e -> new ChartSeriesPoint(e.getKey().name(), BigDecimal.valueOf(e.getValue()), null, "GENDER"))
				.toList();
		return List.of(
				makeChart("student_enrollment_by_class", "Student Enrollment Distribution by Class", "BAR", cPts),
				makeChart("gender_distribution", "Gender-wise Student Distribution", "PIE", gPts));
	}

	private List<ChartDatasetResponse> buildAttendanceCharts(
			List<DailyAttendanceSnapshot> daily, List<MonthlyAttendanceTrendItem> monthly,
			List<ClassAttendancePercentageItem> classPct) {
		List<ChartSeriesPoint> dPts = daily.stream()
				.map(d -> new ChartSeriesPoint(d.date().toString(), BigDecimal.valueOf(d.attendancePercentage()), BigDecimal.valueOf(d.presentCount()), "DAILY"))
				.toList();
		List<ChartSeriesPoint> mPts = monthly.stream()
				.map(m -> new ChartSeriesPoint(m.yearMonth(), BigDecimal.valueOf(m.attendancePercentage()), BigDecimal.valueOf(m.presentCount()), "MONTHLY"))
				.toList();
		List<ChartSeriesPoint> cPts = classPct.stream()
				.map(c -> new ChartSeriesPoint(c.className(), BigDecimal.valueOf(c.attendancePercentage()), BigDecimal.valueOf(c.enrolledStudents()), "CLASS"))
				.toList();
		return List.of(
				makeChart("daily_attendance_trend", "Daily Attendance Trend", "LINE", dPts),
				makeChart("monthly_attendance_trend", "Monthly Attendance Trend", "LINE", mPts),
				makeChart("class_attendance_comparison", "Class-wise Attendance Comparison", "BAR", cPts));
	}

	private List<ChartDatasetResponse> buildExaminationCharts(
			Map<String, Integer> gradeDist, List<SubjectPerformanceSummaryItem> subjSummaries,
			List<ExamComparisonItem> comparisons) {
		List<ChartSeriesPoint> gPts = gradeDist.entrySet().stream()
				.map(e -> new ChartSeriesPoint(e.getKey(), BigDecimal.valueOf(e.getValue()), null, "GRADE"))
				.toList();
		List<ChartSeriesPoint> sPts = subjSummaries.stream()
				.map(s -> new ChartSeriesPoint(s.subjectName() + " (" + s.examinationName() + ")", s.averageMarks(), s.averagePercentage(), "SUBJECT"))
				.toList();
		List<ChartSeriesPoint> cPts = comparisons.stream()
				.filter(ExamComparisonItem::officialResult)
				.map(c -> new ChartSeriesPoint(c.examinationName(), c.averagePercentage(), BigDecimal.valueOf(c.passPercentage()), "EXAM"))
				.toList();
		return List.of(
				makeChart("exam_grade_distribution", "Examination Grade Distribution", "BAR", gPts),
				makeChart("subject_performance_comparison", "Subject-wise Performance Comparison", "BAR", sPts),
				makeChart("exam_comparison_trend", "Performance Trends Across Examinations", "LINE", cPts));
	}
	private ChartDatasetResponse makeChart(
			String key, String title, String type, List<ChartSeriesPoint> points) {
		boolean empty = points == null || points.isEmpty()
				|| points.stream().allMatch(p -> p.value() == null || p.value().compareTo(BigDecimal.ZERO) == 0);
		return new ChartDatasetResponse(
				key, title, type, empty,
				empty ? "No data available for " + title : null,
				points != null ? points : List.of());
	}

	private List<FutureModuleWidgetResponse> collectExtensionWidgets(Long orgId, Long sessionId) {
		List<FutureModuleWidgetResponse> widgets = new ArrayList<>();
		Set<String> contributedCodes = new HashSet<>();
		if (widgetContributors != null) {
			for (DashboardModuleWidgetContributor contributor : widgetContributors) {
				FutureModuleWidgetResponse w = contributor.contributeWidget(orgId, sessionId, currentUser);
				if (w != null) {
					widgets.add(w);
					contributedCodes.add(w.moduleCode().toUpperCase(Locale.ROOT));
				}
			}
		}
		Map<String, String> futureDefaults = Map.of(
				"HOMEWORK", "Homework & Assignments",
				"TRANSPORT", "Transport Management",
				"LIBRARY", "Library Management",
				"HR_PAYROLL", "HR & Payroll",
				"INVENTORY", "Inventory Management");
		for (Map.Entry<String, String> entry : futureDefaults.entrySet()) {
			if (!contributedCodes.contains(entry.getKey())) {
				widgets.add(new FutureModuleWidgetResponse(
						entry.getKey(), entry.getValue(), false,
						entry.getValue() + " module is not enabled yet.", Map.of()));
			}
		}
		return widgets;
	}

	private <T> PagedResponse<T> paginateList(List<T> all, int page, int size) {
		int safePage = Math.max(0, page);
		int safeSize = Math.max(1, Math.min(size, 10000));
		int total = all.size();
		int from = Math.min(safePage * safeSize, total);
		int to = Math.min(from + safeSize, total);
		int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
		return new PagedResponse<>(
				all.subList(from, to), safePage, safeSize, total, totalPages,
				safePage == 0, totalPages == 0 || safePage >= totalPages - 1);
	}

	private SchoolNoticeResponse toNoticeResponse(SchoolNotice n) {
		return new SchoolNoticeResponse(
				n.getId(), n.getOrganizationId(), n.getAcademicSessionId(),
				n.getTitle(), n.getContent(), n.getAudience(),
				n.isImportant(), n.getPublishedDate(), n.isActive(),
				n.getCreatedBy(), n.getCreatedAt());
	}

	private String fullName(Student s) {
		if (s == null) {
			return "";
		}
		return s.getFirstName() + (s.getLastName() != null ? " " + s.getLastName() : "");
	}

	private String nullToEmpty(String s) {
		return s == null ? "" : s;
	}

	private BigDecimal zero() {
		return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
	}

	private double round2(double v) {
		return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
	}
}

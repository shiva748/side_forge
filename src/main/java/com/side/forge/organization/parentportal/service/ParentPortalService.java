package com.side.forge.organization.parentportal.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.repository.OrganizationMembershipRepository;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.notification.dto.NotificationDtos.NotificationResponse;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.session.entity.*;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.attendance.dto.*;
import com.side.forge.organization.attendance.entity.AttendanceAuditLog.TargetType;
import com.side.forge.organization.attendance.entity.StudentAttendanceStatus;
import com.side.forge.organization.attendance.repository.AttendanceAuditLogRepository;
import com.side.forge.organization.attendance.service.AttendanceService;
import com.side.forge.organization.communication.dto.AnnouncementDtos.AnnouncementResponse;
import com.side.forge.organization.communication.service.AnnouncementService;
import com.side.forge.organization.entity.*;
import com.side.forge.organization.examination.dto.*;
import com.side.forge.organization.examination.dto.EnterMarkRequest.ExamMarkResponse;
import com.side.forge.organization.examination.dto.ExaminationResponse.ReportCardResponse;
import com.side.forge.organization.examination.entity.ExaminationStatus;
import com.side.forge.organization.examination.entity.MarkEntryStatus;
import com.side.forge.organization.examination.service.ExaminationService;
import com.side.forge.organization.fees.dto.*;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.FeePaymentReceiptResponse;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.PaymentAllocationResponse;
import com.side.forge.organization.fees.service.FeeManagementService;
import com.side.forge.organization.homework.dto.HomeworkDtos.*;
import com.side.forge.organization.homework.entity.HomeworkSubmissionStatus;
import com.side.forge.organization.homework.service.HomeworkService;
import com.side.forge.organization.parentportal.dto.ParentPortalDtos.*;
import com.side.forge.organization.parentportal.security.ParentChildAccessValidator;
import com.side.forge.organization.parentportal.security.ParentChildAccessValidator.LinkedChildContext;
import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;
import com.side.forge.organization.reporting.service.ReportExportGenerator;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.organization.student.enrollment.dto.StudentEnrollmentResponse;
import com.side.forge.organization.student.enrollment.entity.*;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.guardian.dto.*;
import com.side.forge.organization.student.guardian.entity.*;
import com.side.forge.organization.student.guardian.mapper.GuardianMapper;
import com.side.forge.organization.student.guardian.repository.*;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.mapper.StudentMapper;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;
import com.side.forge.organization.timetable.dto.ClassTimetableResponse;
import com.side.forge.organization.timetable.entity.*;
import com.side.forge.organization.timetable.repository.ClassTimetableRepository;
import com.side.forge.organization.timetable.service.TimetableService;
import com.side.forge.storage.dto.StorageDtos.*;
import com.side.forge.storage.service.FileManagementService;
import com.side.forge.user.service.UserService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ParentPortalService {

	private final ParentChildAccessValidator parentChildValidator;
	private final AcademicTenantAccessValidator tenantValidator;
	private final CurrentUserContext currentUser;
	private final OrganizationRepository organizationRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassRepository classRepository;
	private final StudentRepository studentRepository;
	private final StudentMapper studentMapper;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final GuardianRepository guardianRepository;
	private final GuardianMapper guardianMapper;
	private final StudentGuardianRepository studentGuardianRepository;
	private final AttendanceService attendanceService;
	private final AttendanceAuditLogRepository attendanceAuditLogRepository;
	private final HomeworkService homeworkService;
	private final ExaminationService examinationService;
	private final FeeManagementService feeManagementService;
	private final TimetableService timetableService;
	private final ClassTimetableRepository classTimetableRepository;
	private final AnnouncementService announcementService;
	private final NotificationService notificationService;
	private final FileManagementService fileManagementService;
	private final ReportExportGenerator exportGenerator;
	private final UserService userService;

	@Transactional(readOnly = true)
	public ParentProfileOverviewResponse getParentProfileOverview(Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return new ParentProfileOverviewResponse(
				userService.getProfile(authentication),
				getAllLinkedChildrenAcrossOrganizations(userId));
	}

	@Transactional(readOnly = true)
	public List<LinkedChildSummaryResponse> getAllMyLinkedChildren(Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return getAllLinkedChildrenAcrossOrganizations(userId);
	}

	@Transactional(readOnly = true)
	public List<LinkedChildSummaryResponse> getAllLinkedChildrenAcrossOrganizations(Long userId) {
		if (userId == null) {
			return List.of();
		}
		List<OrganizationMembership> memberships = membershipRepository.findAllByUserIdOrderByIdAsc(userId);
		List<LinkedChildSummaryResponse> all = new ArrayList<>();
		for (OrganizationMembership m : memberships) {
			if (m.getStatus() != MembershipStatus.ACTIVE) {
				continue;
			}
			Optional<Organization> orgOpt = organizationRepository.findById(m.getOrganizationId())
					.filter(o -> o.getStatus() == OrganizationStatus.ACTIVE);
			if (orgOpt.isEmpty()) {
				continue;
			}
			Organization org = orgOpt.get();
			Optional<Guardian> guardianOpt = guardianRepository
					.findByOrganizationIdAndUserId(org.getId(), userId)
					.filter(Guardian::isActive);
			if (guardianOpt.isEmpty()) {
				continue;
			}
			AcademicSession session = resolveSessionOptional(org.getId(), null).orElse(null);
			List<StudentGuardian> links = studentGuardianRepository
					.findAllByOrganizationIdAndGuardianIdOrderByIdAsc(org.getId(), guardianOpt.get().getId());
			all.addAll(mapLinkedChildSummaries(org, session, links));
		}
		return all;
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public List<LinkedChildSummaryResponse> getLinkedChildren(Long orgId, Long academicSessionId) {
		Organization org = tenantValidator.requireOrganization(orgId);
		Guardian guardian = parentChildValidator.requireVerifiedGuardian(orgId);
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId).orElse(null);
		List<StudentGuardian> links = parentChildValidator.getVerifiedChildLinks(orgId, guardian);
		return mapLinkedChildSummaries(org, session, links);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ParentDashboardResponse getParentDashboard(
			Long orgId, Long academicSessionId, LocalDate referenceDate) {
		Organization org = tenantValidator.requireOrganization(orgId);
		Guardian guardian = parentChildValidator.requireVerifiedGuardian(orgId);
		LocalDate refDate = referenceDate != null
				? referenceDate
				: LocalDate.now(tenantValidator.resolveZoneId(org));
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId).orElse(null);

		List<StudentGuardian> links = parentChildValidator.getVerifiedChildLinks(orgId, guardian);
		List<LinkedChildSummaryResponse> childSummaries = mapLinkedChildSummaries(org, session, links);

		int totalPendingHw = 0;
		int totalUpcomingExams = 0;
		BigDecimal totalOutFees = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		List<ChildDashboardCard> cards = new ArrayList<>();

		for (LinkedChildSummaryResponse summary : childSummaries) {
			ChildDashboardCard card = buildChildDashboardCard(org, session, summary, refDate);
			cards.add(card);
			totalPendingHw += card.pendingHomeworkCount() + card.overdueHomeworkCount();
			totalUpcomingExams += card.upcomingExaminations().size();
			totalOutFees = totalOutFees.add(card.outstandingFeeDues());
		}

		List<AnnouncementResponse> recentAnnouncements = announcementService
				.getVisibleAnnouncements(orgId, refDate, null).stream().limit(5).toList();
		Long userId = currentUser.getUserId();
		List<NotificationResponse> recentNotifications = notificationService
				.getUserNotifications(userId, orgId, null, null, null, 0, 5).content();
		long unreadCount = notificationService.getUnreadCount(userId, orgId).unreadCount();

		String guardianName = fullName(guardian.getFirstName(), null, guardian.getLastName());
		return new ParentDashboardResponse(
				org.getId(), org.getName(),
				guardian.getId(), guardianName, guardian.getEmail(), guardian.getPhoneNumber(),
				session != null ? session.getId() : null,
				session != null ? session.getName() : null,
				refDate, cards.size(), totalPendingHw, totalUpcomingExams,
				totalOutFees, unreadCount, cards, recentAnnouncements, recentNotifications);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ChildDashboardCard getChildDashboard(
			Long orgId, Long studentId, Long academicSessionId, LocalDate referenceDate) {
		Organization org = tenantValidator.requireOrganization(orgId);
		LinkedChildContext ctx = parentChildValidator.requireLinkedChild(orgId, studentId);
		LocalDate refDate = referenceDate != null
				? referenceDate
				: LocalDate.now(tenantValidator.resolveZoneId(org));
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId).orElse(null);
		LinkedChildSummaryResponse summary = mapLinkedChildSummaries(org, session, List.of(ctx.link())).getFirst();
		return buildChildDashboardCard(org, session, summary, refDate);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ParentChildDetailResponse getChildDetails(Long orgId, Long studentId) {
		tenantValidator.requireOrganization(orgId);
		LinkedChildContext ctx = parentChildValidator.requireLinkedChild(orgId, studentId);
		Student student = ctx.student();
		StudentResponse profile = studentMapper.toResponse(student);

		List<StudentEnrollmentResponse> enrollments = loadStudentEnrollments(orgId, studentId, profile);
		StudentEnrollmentResponse currentEnrollment = enrollments.stream()
				.filter(e -> e.status() == EnrollmentStatus.ACTIVE)
				.findFirst()
				.orElse(enrollments.isEmpty() ? null : enrollments.getFirst());

		List<StudentGuardian> guardianLinks = studentGuardianRepository
				.findAllByOrganizationIdAndStudentIdOrderByPrimaryContactDescIdAsc(orgId, studentId);
		Map<Long, Guardian> guardianMap = guardianLinks.isEmpty() ? Map.of()
				: guardianRepository.findAllById(
						guardianLinks.stream().map(StudentGuardian::getGuardianId).collect(Collectors.toSet()))
						.stream().collect(Collectors.toMap(Guardian::getId, Function.identity()));
		List<StudentGuardianResponse> guardianDtos = new ArrayList<>();
		for (StudentGuardian link : guardianLinks) {
			Guardian g = guardianMap.get(link.getGuardianId());
			GuardianResponse gDto = g != null ? guardianMapper.toResponse(g) : null;
			guardianDtos.add(new StudentGuardianResponse(
					link.getId(), link.getOrganizationId(), link.getStudentId(),
					link.getGuardianId(), link.getRelationshipType(),
					link.isPrimaryContact(), link.isEmergencyContact(),
					link.isReceiveNotifications(), gDto, link.getCreatedAt(), link.getUpdatedAt()));
		}

		List<StoredFileResponse> photos = fileManagementService.getFilesForResource(
				orgId, StudentService.RESOURCE_STUDENT_PHOTO, studentId);
		Long photoFileId = photos.isEmpty() ? null : photos.getFirst().id();
		String photoUrl = photoFileId == null ? null
				: "/api/organizations/" + orgId + "/parent-portal/children/" + studentId + "/photo";

		List<StoredFileResponse> documents = fileManagementService.getFilesForResource(
				orgId, StudentService.RESOURCE_STUDENT_DOCUMENT, studentId);

		return new ParentChildDetailResponse(
				profile, photoFileId, photoUrl, ctx.link().getRelationshipType(),
				currentEnrollment, enrollments, guardianDtos, documents);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadChildPhoto(Long orgId, Long studentId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		List<StoredFileResponse> photos = fileManagementService.getFilesForResource(
				orgId, StudentService.RESOURCE_STUDENT_PHOTO, studentId);
		if (photos.isEmpty()) {
			throw new EntityNotFoundException("Student does not have a profile photo");
		}
		return fileManagementService.downloadOrganizationFileForAuthorizedResource(
				orgId, photos.getFirst().id(), StudentService.RESOURCE_STUDENT_PHOTO, studentId);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadChildDocument(Long orgId, Long studentId, Long fileId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		return fileManagementService.downloadOrganizationFileForAuthorizedResource(
				orgId, fileId, StudentService.RESOURCE_STUDENT_DOCUMENT, studentId);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ParentChildAttendanceResponse getChildAttendance(
			Long orgId, Long studentId, Long academicSessionId,
			LocalDate startDate, LocalDate endDate, Integer year, Integer month) {
		LinkedChildContext ctx = parentChildValidator.requireLinkedChild(orgId, studentId);
		Student student = ctx.student();
		AcademicSession session = resolveSessionForStudent(orgId, studentId, academicSessionId);

		StudentAttendanceSummaryResponse overall = attendanceService
				.getStudentAttendanceSummary(orgId, studentId, session.getId());
		List<StudentAttendanceResponse> allHistory = attendanceService
				.getStudentAttendanceHistory(orgId, studentId, session.getId());

		List<MonthlyAttendanceSummaryItem> monthly = computeMonthlyAttendanceSummaries(allHistory);

		List<StudentAttendanceResponse> filtered = allHistory.stream()
				.filter(r -> startDate == null || !r.attendanceDate().isBefore(startDate))
				.filter(r -> endDate == null || !r.attendanceDate().isAfter(endDate))
				.filter(r -> year == null || r.attendanceDate().getYear() == year)
				.filter(r -> month == null || r.attendanceDate().getMonthValue() == month)
				.toList();

		List<AttendanceAuditLogResponse> recentUpdates = attendanceAuditLogRepository
				.findAllByOrganizationIdAndTargetTypeAndTargetPersonIdOrderByChangedAtDesc(
						orgId, TargetType.STUDENT, studentId)
				.stream().limit(10)
				.map(log -> new AttendanceAuditLogResponse(
						log.getId(), log.getOrganizationId(), log.getTargetType(),
						log.getAttendanceRecordId(), log.getTargetPersonId(),
						log.getAttendanceDate(), log.getPreviousStatus(), log.getNewStatus(),
						log.getPreviousRemarks(), log.getNewRemarks(),
						log.getChangedBy(), log.getCorrectionReason(), log.getChangedAt()))
				.toList();

		return new ParentChildAttendanceResponse(
				student.getId(), student.getAdmissionNumber(),
				fullName(student.getFirstName(), student.getMiddleName(), student.getLastName()),
				session.getId(), session.getName(),
				overall, monthly, filtered, recentUpdates);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public StudentHomeworkDashboardResponse getChildHomeworkDashboard(
			Long orgId, Long studentId, Long academicSessionId, LocalDate referenceDate) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		return homeworkService.getStudentHomeworkDashboard(orgId, academicSessionId, studentId, referenceDate);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ParentChildHomeworkDetailResponse getChildHomeworkDetail(
			Long orgId, Long studentId, Long homeworkId, LocalDate referenceDate) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		List<StudentHomeworkSubmissionResponse> list = homeworkService
				.getStudentHomeworkList(orgId, studentId, null, referenceDate);
		StudentHomeworkSubmissionResponse sub = list.stream()
				.filter(s -> s.homeworkId().equals(homeworkId))
				.findFirst()
				.orElseThrow(() -> new EntityNotFoundException("Homework assignment not found for this student"));
		List<StoredFileResponse> teacherFiles = homeworkService.getHomeworkAttachments(orgId, homeworkId);
		List<StoredFileResponse> studentFiles = homeworkService
				.getSubmissionAttachments(orgId, homeworkId, sub.submissionId());
		return new ParentChildHomeworkDetailResponse(sub, teacherFiles, studentFiles);
	}

	@RequirePermission(PermissionCode.HOMEWORK_SUBMIT)
	@Transactional
	public StudentHomeworkSubmissionResponse submitChildHomework(
			Long orgId, Long studentId, Long homeworkId, ParentSubmitHomeworkRequest request) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		SubmitHomeworkRequest delegated = new SubmitHomeworkRequest(
				studentId,
				request != null ? request.submissionText() : null,
				request != null ? request.attachments() : null,
				request != null ? request.submissionDate() : null);
		return homeworkService.submitHomework(orgId, homeworkId, delegated);
	}

	@RequirePermission(PermissionCode.HOMEWORK_SUBMIT)
	@Transactional
	public StoredFileResponse uploadChildHomeworkSubmissionFile(
			Long orgId, Long studentId, Long homeworkId,
			String submissionText, LocalDate submissionDate, MultipartFile file) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		return homeworkService.uploadStudentSubmissionAttachment(
				orgId, homeworkId, studentId, submissionText, submissionDate, file);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadChildHomeworkTeacherAttachment(
			Long orgId, Long studentId, Long homeworkId, Long fileId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		return homeworkService.downloadHomeworkAttachment(orgId, homeworkId, fileId);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadChildHomeworkSubmissionFile(
			Long orgId, Long studentId, Long homeworkId, Long submissionId, Long fileId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		return homeworkService.downloadSubmissionAttachment(orgId, homeworkId, submissionId, fileId);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ParentChildExaminationsResponse getChildExaminationsAndResults(
			Long orgId, Long studentId, Long academicSessionId) {
		LinkedChildContext ctx = parentChildValidator.requireLinkedChild(orgId, studentId);
		Student student = ctx.student();
		AcademicSession session = resolveSessionForStudent(orgId, studentId, academicSessionId);
		Optional<StudentEnrollment> enrollmentOpt = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, session.getId(), studentId);
		if (enrollmentOpt.isEmpty()) {
			return new ParentChildExaminationsResponse(
					student.getId(), student.getAdmissionNumber(),
					fullName(student.getFirstName(), student.getMiddleName(), student.getLastName()),
					session.getId(), session.getName(), null, null, List.of(), List.of());
		}
		StudentEnrollment enrollment = enrollmentOpt.get();
		SchoolClass sc = classRepository.findByIdAndOrganizationId(enrollment.getClassId(), orgId).orElse(null);

		List<ExaminationResponse> allClassExams = examinationService
				.getSessionExaminations(orgId, session.getId(), enrollment.getClassId());

		List<ExaminationResponse> upcoming = allClassExams.stream()
				.filter(e -> e.status() != ExaminationStatus.PUBLISHED)
				.toList();
		List<ReportCardResponse> publishedResults = new ArrayList<>();
		for (ExaminationResponse exam : allClassExams) {
			if (exam.status() == ExaminationStatus.PUBLISHED) {
				try {
					publishedResults.add(examinationService.getStudentReportCard(orgId, exam.id(), studentId));
				} catch (EntityNotFoundException ignored) {
				}
			}
		}

		return new ParentChildExaminationsResponse(
				student.getId(), student.getAdmissionNumber(),
				fullName(student.getFirstName(), student.getMiddleName(), student.getLastName()),
				session.getId(), session.getName(),
				enrollment.getClassId(), sc != null ? sc.getName() : null,
				upcoming, publishedResults);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ReportCardResponse getChildReportCard(Long orgId, Long studentId, Long examinationId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		return examinationService.getStudentReportCard(orgId, examinationId, studentId);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ExportDocument downloadChildReportCard(
			Long orgId, Long studentId, Long examinationId, ExportFormat format) {
		ReportCardResponse card = getChildReportCard(orgId, studentId, examinationId);
		ExportFormat fmt = format != null ? format : ExportFormat.PDF;
		List<String> headers = List.of(
				"Subject Code", "Subject Name", "Obtained Marks", "Max Marks", "Passing Marks", "Grade", "Status");
		List<List<String>> rows = new ArrayList<>();
		for (ExamMarkResponse m : card.subjectMarks()) {
			rows.add(List.of(
					String.valueOf(m.subjectCode()),
					String.valueOf(m.subjectName()),
					m.entryStatus() == MarkEntryStatus.ABSENT ? "ABSENT" : String.valueOf(m.marksObtained()),
					String.valueOf(m.maxMarks()),
					String.valueOf(m.passingMarks()),
					String.valueOf(m.grade()),
					m.passed() ? "PASS" : "FAIL"));
		}
		rows.add(List.of(
				"TOTAL",
				card.studentName() + " (" + card.admissionNumber() + ") - " + card.className(),
				String.valueOf(card.totalObtainedMarks()),
				String.valueOf(card.totalMaxMarks()),
				String.valueOf(card.percentage()) + "%",
				String.valueOf(card.overallGrade()),
				card.overallPassed() ? "PASS" : "FAIL"));
		String title = "Report Card - " + card.examinationName() + " - " + card.studentName();
		String filename = "report-card-" + card.admissionNumber() + "-exam-" + card.examinationId();
		Organization org = tenantValidator.requireOrganization(orgId);
		return exportGenerator.generate(
				fmt, filename, org.getName(), title, card.academicSessionName(),
				null, null, headers, rows,
				Map.of(
						"Percentage", card.percentage() + "%",
						"Overall Grade", String.valueOf(card.overallGrade()),
						"Result", card.overallPassed() ? "PASS" : "FAIL"));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ParentConsolidatedFeesResponse getConsolidatedFeesOverview(Long orgId, Long academicSessionId) {
		Guardian guardian = parentChildValidator.requireVerifiedGuardian(orgId);
		AcademicSession session = resolveSessionOptional(orgId, academicSessionId)
				.orElseThrow(() -> new EntityNotFoundException("No academic session found for organization"));
		List<StudentGuardian> links = parentChildValidator.getVerifiedChildLinks(orgId, guardian);

		BigDecimal totalBase = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalConc = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalLate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalNet = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalPaid = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalCredit = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOut = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOverdue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		List<StudentFinancialProfileResponse> profiles = new ArrayList<>();

		for (StudentGuardian link : links) {
			if (enrollmentRepository.findByOrganizationIdAndAcademicSessionIdAndStudentId(
					orgId, session.getId(), link.getStudentId()).isEmpty()) {
				continue;
			}
			StudentFinancialProfileResponse fp = feeManagementService
					.getStudentFinancialProfile(orgId, link.getStudentId(), session.getId());
			profiles.add(fp);
			totalBase = totalBase.add(fp.totalBaseFees());
			totalConc = totalConc.add(fp.totalConcessionsAndWaivers());
			totalLate = totalLate.add(fp.totalLateFees());
			totalNet = totalNet.add(fp.totalNetPayableFees());
			totalPaid = totalPaid.add(fp.totalPaidAmount());
			totalCredit = totalCredit.add(fp.unappliedAccountCredit());
			totalOut = totalOut.add(fp.totalOutstandingBalance());
			totalOverdue = totalOverdue.add(fp.totalOverdueAmount());
		}

		return new ParentConsolidatedFeesResponse(
				orgId, session.getId(), session.getName(),
				totalBase, totalConc, totalLate, totalNet, totalPaid,
				totalCredit, totalOut, totalOverdue, profiles);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public StudentFinancialProfileResponse getChildFinancialProfile(
			Long orgId, Long studentId, Long academicSessionId,
			LocalDate startDate, LocalDate endDate) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		AcademicSession session = resolveSessionForStudent(orgId, studentId, academicSessionId);
		StudentFinancialProfileResponse profile = feeManagementService
				.getStudentFinancialProfile(orgId, studentId, session.getId());
		if (startDate == null && endDate == null) {
			return profile;
		}
		List<FeePaymentReceiptResponse> filteredPayments = profile.paymentHistory().stream()
				.filter(p -> startDate == null || !p.paymentDate().isBefore(startDate))
				.filter(p -> endDate == null || !p.paymentDate().isAfter(endDate))
				.toList();
		return new StudentFinancialProfileResponse(
				profile.organizationId(), profile.academicSessionId(), profile.academicSessionName(),
				profile.classId(), profile.className(), profile.enrollmentId(),
				profile.studentId(), profile.admissionNumber(), profile.studentName(),
				profile.assignedFeeStructure(), profile.assignedFeeStructureVersion(),
				profile.monthlyDemands(), profile.yearlyAndOneTimeDemands(),
				profile.concessions(), profile.totalBaseFees(), profile.totalConcessionsAndWaivers(),
				profile.totalLateFees(), profile.totalNetPayableFees(), profile.totalPaidAmount(),
				profile.unappliedAccountCredit(), profile.totalOutstandingBalance(),
				profile.totalOverdueAmount(), filteredPayments);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public FeePaymentReceiptResponse getChildPaymentReceipt(Long orgId, Long studentId, Long paymentId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		FeePaymentReceiptResponse receipt = feeManagementService.getReceiptById(orgId, paymentId);
		if (!receipt.studentId().equals(studentId)) {
			throw new AccessDeniedException("Fee receipt does not belong to the specified student");
		}
		return receipt;
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ExportDocument downloadChildPaymentReceipt(
			Long orgId, Long studentId, Long paymentId, ExportFormat format) {
		FeePaymentReceiptResponse receipt = getChildPaymentReceipt(orgId, studentId, paymentId);
		ExportFormat fmt = format != null ? format : ExportFormat.PDF;
		List<String> headers = List.of(
				"Receipt Number", "Payment Date", "Student", "Payment Method",
				"Component / Period", "Allocated Amount", "Total Paid");
		List<List<String>> rows = new ArrayList<>();
		if (receipt.allocations() == null || receipt.allocations().isEmpty()) {
			rows.add(List.of(
					String.valueOf(receipt.receiptNumber()),
					String.valueOf(receipt.paymentDate()),
					receipt.studentName() + " (" + receipt.admissionNumber() + ")",
					String.valueOf(receipt.paymentMethod()),
					"Unallocated / Advance Payment",
					String.valueOf(receipt.totalAmount()),
					String.valueOf(receipt.totalAmount())));
		} else {
			for (PaymentAllocationResponse a : receipt.allocations()) {
				rows.add(List.of(
						String.valueOf(receipt.receiptNumber()),
						String.valueOf(receipt.paymentDate()),
						receipt.studentName() + " (" + receipt.admissionNumber() + ")",
						String.valueOf(receipt.paymentMethod()),
						a.componentName() + " (" + a.periodLabel() + ")",
						String.valueOf(a.allocatedAmount()),
						String.valueOf(receipt.totalAmount())));
			}
		}
		String title = "Fee Payment Receipt - " + receipt.receiptNumber() + " - " + receipt.studentName();
		String filename = "fee-receipt-" + receipt.receiptNumber();
		Organization org = tenantValidator.requireOrganization(orgId);
		return exportGenerator.generate(
				fmt, filename, org.getName(), title, receipt.academicSessionName(),
				receipt.paymentDate(), receipt.paymentDate(), headers, rows,
				Map.of(
						"Receipt Number", String.valueOf(receipt.receiptNumber()),
						"Total Paid", String.valueOf(receipt.totalAmount())));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public ClassTimetableResponse getChildTimetable(Long orgId, Long studentId, Long academicSessionId) {
		parentChildValidator.requireLinkedChild(orgId, studentId);
		AcademicSession session = resolveSessionForStudent(orgId, studentId, academicSessionId);
		StudentEnrollment enrollment = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, session.getId(), studentId)
				.orElseThrow(() -> new EntityNotFoundException(
						"Student is not enrolled in a class for the specified academic session"));
		ClassTimetable timetable = classTimetableRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassId(
						orgId, session.getId(), enrollment.getClassId())
				.orElseThrow(() -> new EntityNotFoundException(
						"No timetable has been configured for the student's class in this academic session"));
		if (timetable.getStatus() != TimetableStatus.PUBLISHED) {
			throw new IllegalStateException("Timetable for the student's class has not been published yet");
		}
		return timetableService.getClassTimetableById(orgId, timetable.getId(), null);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public List<AnnouncementResponse> getParentAnnouncements(
			Long orgId, Boolean importantOnly, LocalDate referenceDate) {
		parentChildValidator.requireVerifiedGuardian(orgId);
		return announcementService.getVisibleAnnouncements(orgId, referenceDate, importantOnly);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadParentAnnouncementAttachment(
			Long orgId, Long announcementId, Long fileId) {
		parentChildValidator.requireVerifiedGuardian(orgId);
		return announcementService.downloadAttachment(orgId, announcementId, fileId);
	}

	private ChildDashboardCard buildChildDashboardCard(
			Organization org, AcademicSession session,
			LinkedChildSummaryResponse child, LocalDate referenceDate) {
		Long orgId = org.getId();
		Long studentId = child.studentId();
		Long sessionId = child.academicSessionId() != null
				? child.academicSessionId()
				: (session != null ? session.getId() : null);

		StudentAttendanceSummaryResponse attSummary = null;
		List<StudentAttendanceResponse> recentAtt = List.of();
		int pendingHw = 0, overdueHw = 0, submittedHw = 0, evaluatedHw = 0;
		List<StudentHomeworkSubmissionResponse> upcomingHw = List.of();
		List<ExaminationResponse> upcomingExams = List.of();
		List<ReportCardResponse> publishedResults = List.of();
		BigDecimal totalNetFees = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalPaidFees = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal outFees = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal overdueFees = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		List<FeePaymentReceiptResponse> recentPayments = List.of();

		if (sessionId != null) {
			attSummary = attendanceService.getStudentAttendanceSummary(orgId, studentId, sessionId);
			recentAtt = attendanceService.getStudentAttendanceHistory(orgId, studentId, sessionId)
					.stream().limit(5).toList();

			StudentHomeworkDashboardResponse hwDash = homeworkService
					.getStudentHomeworkDashboard(orgId, sessionId, studentId, referenceDate);
			pendingHw = hwDash.pendingCount();
			overdueHw = hwDash.overdueCount();
			submittedHw = hwDash.submittedCount();
			evaluatedHw = hwDash.evaluatedCount();
			upcomingHw = hwDash.assignments().stream()
					.filter(h -> h.status() == HomeworkSubmissionStatus.PENDING
							|| h.status() == HomeworkSubmissionStatus.OVERDUE)
					.limit(5)
					.toList();

			ParentChildExaminationsResponse examInfo = getChildExaminationsAndResults(orgId, studentId, sessionId);
			upcomingExams = examInfo.upcomingExaminations().stream().limit(5).toList();
			publishedResults = examInfo.publishedResults().stream().limit(5).toList();

			if (child.classId() != null) {
				try {
					StudentFinancialProfileResponse fp = feeManagementService
							.getStudentFinancialProfile(orgId, studentId, sessionId);
					totalNetFees = fp.totalNetPayableFees();
					totalPaidFees = fp.totalPaidAmount();
					outFees = fp.totalOutstandingBalance();
					overdueFees = fp.totalOverdueAmount();
					recentPayments = fp.paymentHistory().stream().limit(5).toList();
				} catch (EntityNotFoundException ignored) {
				}
			}
		}

		return new ChildDashboardCard(
				child, attSummary, recentAtt,
				pendingHw, overdueHw, submittedHw, evaluatedHw,
				upcomingHw, upcomingExams, publishedResults,
				totalNetFees, totalPaidFees, outFees, overdueFees, recentPayments);
	}

	private List<StudentEnrollmentResponse> loadStudentEnrollments(
			Long orgId, Long studentId, StudentResponse studentDto) {
		List<StudentEnrollment> rows = enrollmentRepository
				.findAllByOrganizationIdAndStudentIdOrderByEnrollmentDateDescIdDesc(orgId, studentId);
		if (rows.isEmpty()) {
			return List.of();
		}
		List<StudentEnrollmentResponse> out = new ArrayList<>();
		for (StudentEnrollment e : rows) {
			AcademicSession sess = sessionRepository
					.findByIdAndOrganizationId(e.getAcademicSessionId(), orgId).orElse(null);
			SchoolClass sc = classRepository
					.findByIdAndOrganizationId(e.getClassId(), orgId).orElse(null);
			out.add(new StudentEnrollmentResponse(
					e.getId(), e.getOrganizationId(), e.getStudentId(),
					e.getAcademicSessionId(), sess != null ? sess.getName() : null,
					e.getClassId(), sc != null ? sc.getName() : null,
					sc != null ? sc.getCode() : null, e.getRollNumber(),
					e.getEnrollmentDate(), e.getStatus(), e.getRemarks(),
					studentDto, e.getCreatedAt(), e.getUpdatedAt()));
		}
		return out;
	}

	private List<LinkedChildSummaryResponse> mapLinkedChildSummaries(
			Organization org, AcademicSession preferredSession, List<StudentGuardian> links) {
		if (links.isEmpty()) {
			return List.of();
		}
		Long orgId = org.getId();
		Set<Long> studentIds = links.stream().map(StudentGuardian::getStudentId).collect(Collectors.toSet());
		Map<Long, Student> studentMap = studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds)
				.stream().collect(Collectors.toMap(Student::getId, Function.identity()));

		List<LinkedChildSummaryResponse> out = new ArrayList<>();
		for (StudentGuardian link : links) {
			Student s = studentMap.get(link.getStudentId());
			if (s == null) {
				continue;
			}
			StudentEnrollment enrollment = null;
			AcademicSession enrolledSession = preferredSession;
			if (preferredSession != null) {
				enrollment = enrollmentRepository
						.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, preferredSession.getId(), s.getId())
						.orElse(null);
			}
			if (enrollment == null) {
				List<StudentEnrollment> history = enrollmentRepository
						.findAllByOrganizationIdAndStudentIdOrderByEnrollmentDateDescIdDesc(orgId, s.getId());
				enrollment = history.stream()
						.filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
						.findFirst()
						.orElse(history.isEmpty() ? null : history.getFirst());
				if (enrollment != null) {
					enrolledSession = sessionRepository
							.findByIdAndOrganizationId(enrollment.getAcademicSessionId(), orgId).orElse(null);
				}
			}
			SchoolClass sc = (enrollment != null && enrollment.getClassId() != null)
					? classRepository.findByIdAndOrganizationId(enrollment.getClassId(), orgId).orElse(null)
					: null;

			List<StoredFileResponse> photos = fileManagementService.getFilesForResource(
					orgId, StudentService.RESOURCE_STUDENT_PHOTO, s.getId());
			Long photoFileId = photos.isEmpty() ? null : photos.getFirst().id();
			String photoUrl = photoFileId == null ? null
					: "/api/organizations/" + orgId + "/parent-portal/children/" + s.getId() + "/photo";

			out.add(new LinkedChildSummaryResponse(
					s.getId(), orgId, org.getName(), s.getAdmissionNumber(),
					s.getFirstName(), s.getMiddleName(), s.getLastName(),
					fullName(s.getFirstName(), s.getMiddleName(), s.getLastName()),
					s.getGender(), s.getDateOfBirth(), s.getStatus(),
					photoFileId, photoUrl,
					link.getRelationshipType(), link.isPrimaryContact(),
					link.isEmergencyContact(), link.isReceiveNotifications(),
					enrolledSession != null ? enrolledSession.getId() : null,
					enrolledSession != null ? enrolledSession.getName() : null,
					sc != null ? sc.getId() : null,
					sc != null ? sc.getName() : null,
					enrollment != null ? enrollment.getRollNumber() : null,
					enrollment != null ? enrollment.getStatus() : null));
		}
		return out;
	}

	private List<MonthlyAttendanceSummaryItem> computeMonthlyAttendanceSummaries(
			List<StudentAttendanceResponse> records) {
		Map<YearMonth, List<StudentAttendanceResponse>> byMonth = new TreeMap<>(Comparator.reverseOrder());
		for (StudentAttendanceResponse r : records) {
			byMonth.computeIfAbsent(YearMonth.from(r.attendanceDate()), k -> new ArrayList<>()).add(r);
		}
		List<MonthlyAttendanceSummaryItem> out = new ArrayList<>();
		for (Map.Entry<YearMonth, List<StudentAttendanceResponse>> entry : byMonth.entrySet()) {
			int present = 0, absent = 0, late = 0, halfDay = 0, excused = 0, holiday = 0;
			for (StudentAttendanceResponse r : entry.getValue()) {
				StudentAttendanceStatus st = r.status();
				switch (st) {
					case PRESENT -> present++;
					case ABSENT -> absent++;
					case LATE -> late++;
					case HALF_DAY -> halfDay++;
					case EXCUSED -> excused++;
					case HOLIDAY -> holiday++;
				}
			}
			int workingDays = present + absent + late + halfDay;
			double attendedUnits = present + late + (halfDay * 0.5);
			double pct = workingDays == 0 ? 0.0
					: Math.round((attendedUnits * 10000.0) / workingDays) / 100.0;
			out.add(new MonthlyAttendanceSummaryItem(
					entry.getKey().toString(), workingDays,
					present, absent, late, halfDay, excused, holiday, pct));
		}
		return out;
	}

	private Optional<AcademicSession> resolveSessionOptional(Long orgId, Long academicSessionId) {
		if (academicSessionId != null) {
			return Optional.of(sessionService.requireSession(orgId, academicSessionId));
		}
		List<AcademicSession> active = sessionRepository
				.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(orgId, AcademicSessionStatus.ACTIVE);
		if (!active.isEmpty()) {
			return Optional.of(active.getFirst());
		}
		List<AcademicSession> all = sessionRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		return all.isEmpty() ? Optional.empty() : Optional.of(all.getFirst());
	}

	private AcademicSession resolveSessionForStudent(Long orgId, Long studentId, Long academicSessionId) {
		if (academicSessionId != null) {
			return sessionService.requireSession(orgId, academicSessionId);
		}
		List<StudentEnrollment> enrollments = enrollmentRepository
				.findAllByOrganizationIdAndStudentIdOrderByEnrollmentDateDescIdDesc(orgId, studentId);
		Optional<StudentEnrollment> activeEnrollment = enrollments.stream()
				.filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
				.findFirst();
		if (activeEnrollment.isPresent()) {
			return sessionService.requireSession(orgId, activeEnrollment.get().getAcademicSessionId());
		}
		return resolveSessionOptional(orgId, null)
				.orElseThrow(() -> new EntityNotFoundException("No academic session found for organization"));
	}

	private static String fullName(String first, String middle, String last) {
		StringBuilder sb = new StringBuilder();
		if (first != null && !first.isBlank()) {
			sb.append(first.trim());
		}
		if (middle != null && !middle.isBlank()) {
			if (!sb.isEmpty()) sb.append(' ');
			sb.append(middle.trim());
		}
		if (last != null && !last.isBlank()) {
			if (!sb.isEmpty()) sb.append(' ');
			sb.append(last.trim());
		}
		return sb.toString();
	}
}

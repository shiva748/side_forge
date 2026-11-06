package com.side.forge.organization.attendance.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.attendance.dto.*;
import com.side.forge.organization.attendance.entity.*;
import com.side.forge.organization.attendance.entity.AttendanceAuditLog.TargetType;
import com.side.forge.organization.attendance.repository.*;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.parentportal.security.ParentChildAccessValidator;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.staff.service.StaffService;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AttendanceService {

	private final StudentAttendanceRepository studentAttendanceRepository;
	private final StaffAttendanceRepository staffAttendanceRepository;
	private final AttendanceAuditLogRepository auditLogRepository;
	private final AcademicSessionService sessionService;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final StudentService studentService;
	private final StudentRepository studentRepository;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final StaffService staffService;
	private final StaffRepository staffRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final NotificationService notificationService;
	private final ParentChildAccessValidator parentChildValidator;

	@RequirePermission(PermissionCode.ATTENDANCE_MARK)
	@Transactional
	public StudentAttendanceResponse markStudentAttendance(Long orgId, MarkStudentAttendanceRequest request) {
		Organization org = validator.requireOrganization(orgId);
		validateNotFutureDate(request.attendanceDate(), org);
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		SchoolClass schoolClass = classRepository.findByIdAndOrganizationIdForUpdate(request.classId(), orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));
		Student student = studentService.requireStudentForUpdate(orgId, request.studentId());

		StudentEnrollment enrollment = requireValidEnrollment(orgId, session.getId(), schoolClass.getId(), student.getId());

		if (studentAttendanceRepository.existsByOrganizationIdAndAcademicSessionIdAndStudentIdAndAttendanceDate(
				orgId, session.getId(), student.getId(), request.attendanceDate())) {
			throw new IllegalStateException("Attendance is already marked for this student on the specified date");
		}

		StudentAttendance record = new StudentAttendance();
		record.setOrganizationId(orgId);
		record.setAcademicSessionId(session.getId());
		record.setClassId(schoolClass.getId());
		record.setEnrollmentId(enrollment.getId());
		record.setStudentId(student.getId());
		record.setAttendanceDate(request.attendanceDate());
		record.setStatus(request.status());
		record.setMarkedBy(currentUser.getUserId());
		record.setRemarks(validator.normalizeOptionalText(request.remarks()));

		StudentAttendance saved = studentAttendanceRepository.saveAndFlush(record);
		notificationService.notifyStudentAttendanceMarked(saved, schoolClass.getName(), student);
		return toStudentAttendanceResponse(saved, schoolClass, student);
	}

	@RequirePermission(PermissionCode.ATTENDANCE_MARK)
	@Transactional
	public List<StudentAttendanceResponse> markBulkStudentAttendance(Long orgId, BulkStudentAttendanceRequest request) {
		Organization org = validator.requireOrganization(orgId);
		validateNotFutureDate(request.attendanceDate(), org);
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		SchoolClass schoolClass = classRepository.findByIdAndOrganizationIdForUpdate(request.classId(), orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));

		Set<Long> seenStudentIds = new HashSet<>();
		List<StudentAttendance> toSave = new ArrayList<>();
		Map<Long, Student> studentMap = new HashMap<>();

		for (BulkStudentAttendanceRequest.Entry item : request.records()) {
			if (!seenStudentIds.add(item.studentId())) {
				throw new IllegalArgumentException("Duplicate student ID in bulk attendance request: " + item.studentId());
			}
			Student student = studentService.requireStudentForUpdate(orgId, item.studentId());
			studentMap.put(student.getId(), student);
			StudentEnrollment enrollment = requireValidEnrollment(
					orgId, session.getId(), schoolClass.getId(), student.getId());

			if (studentAttendanceRepository.existsByOrganizationIdAndAcademicSessionIdAndStudentIdAndAttendanceDate(
					orgId, session.getId(), student.getId(), request.attendanceDate())) {
				throw new IllegalStateException(
						"Attendance is already marked for student " + student.getAdmissionNumber() + " on " + request.attendanceDate());
			}

			StudentAttendance record = new StudentAttendance();
			record.setOrganizationId(orgId);
			record.setAcademicSessionId(session.getId());
			record.setClassId(schoolClass.getId());
			record.setEnrollmentId(enrollment.getId());
			record.setStudentId(student.getId());
			record.setAttendanceDate(request.attendanceDate());
			record.setStatus(item.status());
			record.setMarkedBy(currentUser.getUserId());
			record.setRemarks(validator.normalizeOptionalText(item.remarks()));
			toSave.add(record);
		}

		List<StudentAttendance> saved = studentAttendanceRepository.saveAllAndFlush(toSave);
		for (StudentAttendance r : saved) {
			notificationService.notifyStudentAttendanceMarked(r, schoolClass.getName(), studentMap.get(r.getStudentId()));
		}
		return saved.stream()
				.map(r -> toStudentAttendanceResponse(r, schoolClass, studentMap.get(r.getStudentId())))
				.toList();
	}

	@RequirePermission(PermissionCode.ATTENDANCE_UPDATE)
	@Transactional
	public StudentAttendanceResponse updateStudentAttendance(
			Long orgId, Long attendanceId, UpdateStudentAttendanceRequest request) {
		validator.requireOrganization(orgId);
		StudentAttendance record = studentAttendanceRepository.findByIdAndOrganizationId(attendanceId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student attendance record not found"));

		requireModifiableSession(orgId, record.getAcademicSessionId());

		AttendanceAuditLog audit = new AttendanceAuditLog();
		audit.setOrganizationId(orgId);
		audit.setTargetType(TargetType.STUDENT);
		audit.setAttendanceRecordId(record.getId());
		audit.setTargetPersonId(record.getStudentId());
		audit.setAttendanceDate(record.getAttendanceDate());
		audit.setPreviousStatus(record.getStatus().name());
		audit.setNewStatus(request.status().name());
		audit.setPreviousRemarks(record.getRemarks());
		audit.setNewRemarks(validator.normalizeOptionalText(request.remarks()));
		audit.setChangedBy(currentUser.getUserId());
		audit.setCorrectionReason(validator.normalizeOptionalText(request.correctionReason()));
		auditLogRepository.save(audit);

		record.setStatus(request.status());
		record.setRemarks(validator.normalizeOptionalText(request.remarks()));
		record.setUpdatedBy(currentUser.getUserId());

		StudentAttendance saved = studentAttendanceRepository.save(record);
		SchoolClass sc = classService.requireClass(orgId, saved.getClassId());
		Student st = studentService.requireStudent(orgId, saved.getStudentId());
		notificationService.notifyStudentAttendanceUpdated(saved, audit.getPreviousStatus(), sc.getName(), st);
		return toStudentAttendanceResponse(saved, sc, st);
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public List<StudentAttendanceResponse> getClassAttendance(
			Long orgId, Long sessionId, Long classId, LocalDate attendanceDate) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);
		classService.requireClass(orgId, classId);

		List<StudentAttendance> rows = attendanceDate == null
				? studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByAttendanceDateDescStudentIdAsc(
						orgId, sessionId, classId)
				: studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndAttendanceDateOrderByStudentIdAsc(
						orgId, sessionId, classId, attendanceDate);
		return mapStudentAttendanceList(orgId, rows);
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public List<StudentAttendanceResponse> getStudentAttendanceHistory(
			Long orgId, Long studentId, Long academicSessionId) {
		validator.requireOrganization(orgId);
		parentChildValidator.verifyStudentAccessForCurrentUser(orgId, studentId);
		studentService.requireStudent(orgId, studentId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}

		List<StudentAttendance> rows = academicSessionId == null
				? studentAttendanceRepository.findAllByOrganizationIdAndStudentIdOrderByAttendanceDateDesc(orgId, studentId)
				: studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByAttendanceDateDesc(
						orgId, academicSessionId, studentId);
		return mapStudentAttendanceList(orgId, rows);
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public StudentAttendanceSummaryResponse getStudentAttendanceSummary(
			Long orgId, Long studentId, Long academicSessionId) {
		validator.requireOrganization(orgId);
		parentChildValidator.verifyStudentAccessForCurrentUser(orgId, studentId);
		Student student = studentService.requireStudent(orgId, studentId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}
		List<StudentAttendance> rows = academicSessionId == null
				? studentAttendanceRepository.findAllByOrganizationIdAndStudentIdOrderByAttendanceDateDesc(orgId, studentId)
				: studentAttendanceRepository.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByAttendanceDateDesc(
						orgId, academicSessionId, studentId);
		return calculateStudentSummary(student, rows);
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public ClassAttendanceReportResponse getClassAttendanceReport(
			Long orgId, Long sessionId, Long classId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, sessionId);
		SchoolClass sc = classService.requireClass(orgId, classId);

		List<StudentAttendance> rows = studentAttendanceRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByAttendanceDateDescStudentIdAsc(
						orgId, sessionId, classId);
		List<StudentEnrollment> enrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(orgId, sessionId, classId);

		Set<Long> studentIds = enrollments.stream().map(StudentEnrollment::getStudentId).collect(Collectors.toSet());
		rows.forEach(r -> studentIds.add(r.getStudentId()));
		Map<Long, Student> studentMap = studentIds.isEmpty() ? Map.of() : studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds)
				.stream().collect(Collectors.toMap(Student::getId, Function.identity()));

		Map<Long, List<StudentAttendance>> byStudent = rows.stream()
				.collect(Collectors.groupingBy(StudentAttendance::getStudentId));

		List<StudentAttendanceSummaryResponse> summaries = studentIds.stream()
				.map(sId -> calculateStudentSummary(studentMap.get(sId), byStudent.getOrDefault(sId, List.of())))
				.sorted(Comparator.comparing(StudentAttendanceSummaryResponse::studentName))
				.toList();

		int presentTotal = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::presentCount).sum();
		int absentTotal = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::absentCount).sum();
		int lateTotal = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::lateCount).sum();
		int halfDayTotal = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::halfDayCount).sum();
		int excusedTotal = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::excusedDays).sum();
		int holidayTotal = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::holidayDays).sum();
		int totalApplicable = summaries.stream().mapToInt(StudentAttendanceSummaryResponse::applicableWorkingDays).sum();
		double weightedPresent = presentTotal + lateTotal + (halfDayTotal * 0.5);
		double overallPct = totalApplicable == 0 ? 0.0 : round2((weightedPresent * 100.0) / totalApplicable);

		return new ClassAttendanceReportResponse(
				sessionId, classId, sc.getName(), overallPct,
				presentTotal, absentTotal, lateTotal, halfDayTotal, excusedTotal, holidayTotal, summaries);
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_MANAGE)
	@Transactional
	public StaffAttendanceResponse markStaffAttendance(Long orgId, MarkStaffAttendanceRequest request) {
		Organization org = validator.requireOrganization(orgId);
		validateNotFutureDate(request.attendanceDate(), org);
		Staff staff = staffService.requireStaffForUpdate(orgId, request.staffId());
		if (staff.getEmploymentStatus() != EmploymentStatus.ACTIVE
				&& staff.getEmploymentStatus() != EmploymentStatus.ON_LEAVE) {
			throw new IllegalStateException("Cannot mark attendance for an inactive or former staff member");
		}

		if (staffAttendanceRepository.existsByOrganizationIdAndStaffIdAndAttendanceDate(
				orgId, staff.getId(), request.attendanceDate())) {
			throw new IllegalStateException("Attendance is already marked for this staff member on the specified date");
		}

		StaffAttendance record = new StaffAttendance();
		record.setOrganizationId(orgId);
		record.setStaffId(staff.getId());
		record.setAttendanceDate(request.attendanceDate());
		record.setStatus(request.status());
		record.setMarkedBy(currentUser.getUserId());
		record.setRemarks(validator.normalizeOptionalText(request.remarks()));

		StaffAttendance saved = staffAttendanceRepository.saveAndFlush(record);
		return toStaffAttendanceResponse(saved, staff);
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_MANAGE)
	@Transactional
	public StaffAttendanceResponse updateStaffAttendance(
			Long orgId, Long attendanceId, UpdateStaffAttendanceRequest request) {
		validator.requireOrganization(orgId);
		StaffAttendance record = staffAttendanceRepository.findByIdAndOrganizationId(attendanceId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff attendance record not found"));

		AttendanceAuditLog audit = new AttendanceAuditLog();
		audit.setOrganizationId(orgId);
		audit.setTargetType(TargetType.STAFF);
		audit.setAttendanceRecordId(record.getId());
		audit.setTargetPersonId(record.getStaffId());
		audit.setAttendanceDate(record.getAttendanceDate());
		audit.setPreviousStatus(record.getStatus().name());
		audit.setNewStatus(request.status().name());
		audit.setPreviousRemarks(record.getRemarks());
		audit.setNewRemarks(validator.normalizeOptionalText(request.remarks()));
		audit.setChangedBy(currentUser.getUserId());
		audit.setCorrectionReason(validator.normalizeOptionalText(request.correctionReason()));
		auditLogRepository.save(audit);

		record.setStatus(request.status());
		record.setRemarks(validator.normalizeOptionalText(request.remarks()));
		record.setUpdatedBy(currentUser.getUserId());

		StaffAttendance saved = staffAttendanceRepository.save(record);
		Staff staff = staffService.requireStaff(orgId, saved.getStaffId());
		return toStaffAttendanceResponse(saved, staff);
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public List<StaffAttendanceResponse> getStaffAttendance(
			Long orgId, Long staffId, LocalDate date, Integer year, Integer month) {
		validator.requireOrganization(orgId);
		if (staffId != null) {
			staffService.requireStaff(orgId, staffId);
		}

		List<StaffAttendance> rows;
		if (year != null && month != null) {
			YearMonth ym = YearMonth.of(year, month);
			rows = staffId != null
					? staffAttendanceRepository.findAllByOrganizationIdAndStaffIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(
							orgId, staffId, ym.atDay(1), ym.atEndOfMonth())
					: staffAttendanceRepository.findAllByOrganizationIdAndAttendanceDateBetweenOrderByAttendanceDateAscStaffIdAsc(
							orgId, ym.atDay(1), ym.atEndOfMonth());
		} else if (date != null) {
			rows = staffAttendanceRepository.findAllByOrganizationIdAndAttendanceDateOrderByStaffIdAsc(orgId, date);
			if (staffId != null) {
				rows = rows.stream().filter(r -> staffId.equals(r.getStaffId())).toList();
			}
		} else if (staffId != null) {
			rows = staffAttendanceRepository.findAllByOrganizationIdAndStaffIdOrderByAttendanceDateDesc(orgId, staffId);
		} else {
			throw new IllegalArgumentException("Specify staffId, date, or year and month to retrieve staff attendance");
		}

		return mapStaffAttendanceList(orgId, rows);
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public StaffAttendanceSummaryResponse getStaffAttendanceSummary(
			Long orgId, Long staffId, Integer year, Integer month) {
		validator.requireOrganization(orgId);
		Staff staff = staffService.requireStaff(orgId, staffId);
		List<StaffAttendance> rows;
		if (year != null && month != null) {
			YearMonth ym = YearMonth.of(year, month);
			rows = staffAttendanceRepository.findAllByOrganizationIdAndStaffIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(
					orgId, staffId, ym.atDay(1), ym.atEndOfMonth());
		} else {
			rows = staffAttendanceRepository.findAllByOrganizationIdAndStaffIdOrderByAttendanceDateDesc(orgId, staffId);
		}
		return calculateStaffSummary(staff, rows);
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@Transactional(readOnly = true)
	public List<AttendanceAuditLogResponse> getAuditHistory(
			Long orgId, TargetType targetType, Long attendanceRecordId) {
		validator.requireOrganization(orgId);
		return auditLogRepository
				.findAllByOrganizationIdAndTargetTypeAndAttendanceRecordIdOrderByChangedAtDesc(
						orgId, targetType, attendanceRecordId)
				.stream()
				.map(a -> new AttendanceAuditLogResponse(
						a.getId(), a.getOrganizationId(), a.getTargetType(), a.getAttendanceRecordId(),
						a.getTargetPersonId(), a.getAttendanceDate(), a.getPreviousStatus(), a.getNewStatus(),
						a.getPreviousRemarks(), a.getNewRemarks(), a.getChangedBy(),
						a.getCorrectionReason(), a.getChangedAt()))
				.toList();
	}

	private StudentEnrollment requireValidEnrollment(Long orgId, Long sessionId, Long classId, Long studentId) {
		StudentEnrollment enrollment = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, sessionId, studentId)
				.orElseThrow(() -> new IllegalStateException(
						"Student is not enrolled in the specified academic session"));
		if (!enrollment.getClassId().equals(classId)) {
			throw new IllegalStateException("Student is not enrolled in the specified class for this session");
		}
		if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
			throw new IllegalStateException("Cannot mark attendance for an inactive enrollment");
		}
		return enrollment;
	}

	private AcademicSession requireModifiableSession(Long orgId, Long sessionId) {
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot mark or modify attendance for a completed academic session");
		}
		return session;
	}

	private void validateNotFutureDate(LocalDate attendanceDate, Organization org) {
		LocalDate today = LocalDate.now(validator.resolveZoneId(org));
		if (attendanceDate == null || attendanceDate.isAfter(today)) {
			throw new IllegalArgumentException("Attendance date cannot be in the future");
		}
	}

	/**
	 * Explicit percentage rule:
	 * - HOLIDAY and EXCUSED records are excluded from applicableWorkingDays.
	 * - PRESENT and LATE count as 1.0 attended day; HALF_DAY counts as 0.5; ABSENT counts as 0.0.
	 */
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
		String fullName = student == null ? "" : (student.getFirstName()
				+ (student.getLastName() != null ? " " + student.getLastName() : ""));
		return new StudentAttendanceSummaryResponse(
				student != null ? student.getId() : null,
				student != null ? student.getAdmissionNumber() : null,
				fullName, rows.size(), holiday, excused, applicable,
				present, late, halfDay, absent, pct);
	}

	private StaffAttendanceSummaryResponse calculateStaffSummary(Staff staff, List<StaffAttendance> rows) {
		int holiday = 0, present = 0, late = 0, halfDay = 0, absent = 0, onLeave = 0;
		for (StaffAttendance r : rows) {
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
		double weighted = present + late + (halfDay * 0.5);
		double pct = applicable == 0 ? 0.0 : round2((weighted * 100.0) / applicable);
		String fullName = staff.getFirstName() + (staff.getLastName() != null ? " " + staff.getLastName() : "");
		return new StaffAttendanceSummaryResponse(
				staff.getId(), staff.getEmployeeId(), fullName,
				rows.size(), holiday, applicable, present, late, halfDay, absent, onLeave, pct);
	}

	private double round2(double value) {
		return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
	}

	private List<StudentAttendanceResponse> mapStudentAttendanceList(Long orgId, List<StudentAttendance> rows) {
		if (rows.isEmpty()) {
			return List.of();
		}
		Map<Long, SchoolClass> classMap = classRepository.findAllById(
				rows.stream().map(StudentAttendance::getClassId).collect(Collectors.toSet())).stream()
				.filter(c -> orgId.equals(c.getOrganizationId()))
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(
				orgId, rows.stream().map(StudentAttendance::getStudentId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		return rows.stream()
				.map(r -> toStudentAttendanceResponse(
						r, classMap.get(r.getClassId()), studentMap.get(r.getStudentId())))
				.toList();
	}

	private List<StaffAttendanceResponse> mapStaffAttendanceList(Long orgId, List<StaffAttendance> rows) {
		if (rows.isEmpty()) {
			return List.of();
		}
		Map<Long, Staff> staffMap = staffRepository.findAllByOrganizationIdAndIdIn(
				orgId, rows.stream().map(StaffAttendance::getStaffId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(Staff::getId, Function.identity()));
		return rows.stream()
				.map(r -> toStaffAttendanceResponse(r, staffMap.get(r.getStaffId())))
				.toList();
	}

	private StudentAttendanceResponse toStudentAttendanceResponse(
			StudentAttendance r, SchoolClass sc, Student st) {
		return new StudentAttendanceResponse(
				r.getId(), r.getOrganizationId(), r.getAcademicSessionId(),
				r.getClassId(), sc != null ? sc.getName() : null,
				r.getEnrollmentId(), r.getStudentId(),
				st != null ? st.getAdmissionNumber() : null,
				st != null ? st.getFirstName() : null, st != null ? st.getLastName() : null,
				r.getAttendanceDate(), r.getStatus(), r.getMarkedBy(), r.getUpdatedBy(),
				r.getRemarks(), r.getCreatedAt(), r.getUpdatedAt()
		);
	}

	private StaffAttendanceResponse toStaffAttendanceResponse(StaffAttendance r, Staff st) {
		return new StaffAttendanceResponse(
				r.getId(), r.getOrganizationId(), r.getStaffId(),
				st != null ? st.getEmployeeId() : null,
				st != null ? st.getFirstName() : null, st != null ? st.getLastName() : null,
				r.getAttendanceDate(), r.getStatus(), r.getMarkedBy(), r.getUpdatedBy(),
				r.getRemarks(), r.getCreatedAt(), r.getUpdatedAt()
		);
	}
}

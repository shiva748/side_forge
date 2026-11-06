package com.side.forge.organization.reporting.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.*;
import com.side.forge.organization.reporting.dto.ReportDtos.*;
import com.side.forge.organization.reporting.service.DashboardAndReportService;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class DashboardAndReportController {

	private final DashboardAndReportService service;

	@PostMapping("/notices")
	public ResponseEntity<ApiResponse<SchoolNoticeResponse>> createNotice(
			@PathVariable Long organizationId,
			@Valid @RequestBody CreateSchoolNoticeRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "School notice created successfully",
						service.createNotice(organizationId, request)));
	}

	@GetMapping("/notices")
	public ResponseEntity<ApiResponse<List<SchoolNoticeResponse>>> getNotices(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Boolean importantOnly) {
		return ResponseEntity.ok(new ApiResponse<>(true, "School notices retrieved successfully",
				service.getNotices(organizationId, importantOnly)));
	}

	@GetMapping("/dashboards/admin")
	public ResponseEntity<ApiResponse<AdminDashboardResponse>> getAdminDashboard(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Admin dashboard retrieved successfully",
				service.getAdminDashboard(organizationId, academicSessionId, sessionScope, referenceDate)));
	}

	@GetMapping("/dashboards/principal")
	public ResponseEntity<ApiResponse<PrincipalDashboardResponse>> getPrincipalDashboard(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate,
			@RequestParam(required = false) Double lowAttendanceThreshold,
			@RequestParam(required = false) Double academicAttentionThreshold) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Principal dashboard retrieved successfully",
				service.getPrincipalDashboard(
						organizationId, academicSessionId, sessionScope, referenceDate,
						lowAttendanceThreshold, academicAttentionThreshold)));
	}

	@GetMapping("/dashboards/accountant")
	public ResponseEntity<ApiResponse<AccountantDashboardResponse>> getAccountantDashboard(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Accountant dashboard retrieved successfully",
				service.getAccountantDashboard(organizationId, academicSessionId, sessionScope, referenceDate)));
	}

	@GetMapping("/dashboards/teacher")
	public ResponseEntity<ApiResponse<TeacherDashboardResponse>> getTeacherDashboard(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) Long teacherId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher dashboard retrieved successfully",
				service.getTeacherDashboard(organizationId, academicSessionId, sessionScope, teacherId, referenceDate)));
	}
	@GetMapping("/reports/students-enrollment")
	public ResponseEntity<ApiResponse<StudentEnrollmentReportResponse>> getStudentEnrollmentReport(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) DateRangePreset datePreset,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
			@RequestParam(required = false) String selectedMonth,
			@RequestParam(required = false) Long classId,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "50") int size) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Student enrollment report retrieved successfully",
				service.getStudentEnrollmentReport(
						organizationId, academicSessionId, sessionScope,
						datePreset, startDate, endDate, selectedMonth, classId, page, size)));
	}

	@GetMapping("/reports/attendance")
	public ResponseEntity<ApiResponse<AttendanceReportResponse>> getAttendanceReport(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) DateRangePreset datePreset,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
			@RequestParam(required = false) String selectedMonth,
			@RequestParam(required = false) Long classId,
			@RequestParam(required = false) Long studentId,
			@RequestParam(required = false) Long staffId,
			@RequestParam(required = false) Double threshold,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "50") int size) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Attendance report retrieved successfully",
				service.getAttendanceReport(
						organizationId, academicSessionId, sessionScope,
						datePreset, startDate, endDate, selectedMonth,
						classId, studentId, staffId, threshold, page, size)));
	}

	@GetMapping("/reports/examinations")
	public ResponseEntity<ApiResponse<ExaminationPerformanceReportResponse>> getExaminationPerformanceReport(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) Long classId,
			@RequestParam(required = false) Long examinationId,
			@RequestParam(required = false) Long studentId,
			@RequestParam(required = false) Boolean includeDrafts,
			@RequestParam(required = false) Double threshold) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Examination performance report retrieved successfully",
				service.getExaminationPerformanceReport(
						organizationId, academicSessionId, sessionScope,
						classId, examinationId, studentId, includeDrafts, threshold)));
	}

	@GetMapping("/reports/financial")
	public ResponseEntity<ApiResponse<FinancialReportResponse>> getFinancialReport(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) DateRangePreset datePreset,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
			@RequestParam(required = false) String selectedMonth,
			@RequestParam(required = false) Long classId,
			@RequestParam(required = false) Long studentId,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "50") int size) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Financial report retrieved successfully",
				service.getFinancialReport(
						organizationId, academicSessionId, sessionScope,
						datePreset, startDate, endDate, selectedMonth, classId, studentId, page, size)));
	}

	@GetMapping("/reports/{reportType}/export")
	public ResponseEntity<byte[]> exportReport(
			@PathVariable Long organizationId,
			@PathVariable String reportType,
			@RequestParam(defaultValue = "CSV") ExportFormat format,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) DateRangePreset datePreset,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
			@RequestParam(required = false) String selectedMonth,
			@RequestParam(required = false) Long classId,
			@RequestParam(required = false) Long examinationId,
			@RequestParam(required = false) Long studentId,
			@RequestParam(required = false) Long staffId,
			@RequestParam(required = false) Double threshold) {
		ExportDocument doc = service.exportReport(
				organizationId, reportType, format,
				academicSessionId, sessionScope, datePreset, startDate, endDate, selectedMonth,
				classId, examinationId, studentId, staffId, threshold);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.filename() + "\"")
				.contentType(MediaType.parseMediaType(doc.contentType()))
				.body(doc.content());
	}
}

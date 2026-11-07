package com.side.forge.organization.reporting.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.AcademicSessionScope;
import com.side.forge.organization.reporting.dto.DashboardDtos.AccountantDashboardResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.AdminDashboardResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.CreateSchoolNoticeRequest;
import com.side.forge.organization.reporting.dto.DashboardDtos.DateRangePreset;
import com.side.forge.organization.reporting.dto.DashboardDtos.PrincipalDashboardResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.SchoolNoticeResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.TeacherDashboardResponse;
import com.side.forge.organization.reporting.dto.ReportDtos.AttendanceReportResponse;
import com.side.forge.organization.reporting.dto.ReportDtos.ExaminationPerformanceReportResponse;
import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;
import com.side.forge.organization.reporting.dto.ReportDtos.FinancialReportResponse;
import com.side.forge.organization.reporting.dto.ReportDtos.StudentEnrollmentReportResponse;
import com.side.forge.organization.reporting.service.DashboardAndReportService;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.DASHBOARD_AND_REPORTS)
@Tag(name = "Dashboards & Reports", description = "Role-based school dashboards, analytical reports, notices, and CSV/Excel/PDF exports")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class DashboardAndReportController {

	private final DashboardAndReportService service;

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@PostMapping("/notices")
	public ResponseEntity<ApiResponse<SchoolNoticeResponse>> createNotice(
			@PathVariable Long organizationId,
			@Valid @RequestBody CreateSchoolNoticeRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "School notice created successfully",
						service.createNotice(organizationId, request)));
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@GetMapping("/notices")
	public ResponseEntity<ApiResponse<List<SchoolNoticeResponse>>> getNotices(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Boolean importantOnly) {
		return ResponseEntity.ok(new ApiResponse<>(true, "School notices retrieved successfully",
				service.getNotices(organizationId, importantOnly)));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
	@GetMapping("/dashboards/admin")
	public ResponseEntity<ApiResponse<AdminDashboardResponse>> getAdminDashboard(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Admin dashboard retrieved successfully",
				service.getAdminDashboard(organizationId, academicSessionId, sessionScope, referenceDate)));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
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

	@RequirePermission(PermissionCode.FEES_REPORT_VIEW)
	@GetMapping("/dashboards/accountant")
	public ResponseEntity<ApiResponse<AccountantDashboardResponse>> getAccountantDashboard(
			@PathVariable Long organizationId,
			@RequestParam(required = false) Long academicSessionId,
			@RequestParam(required = false) AcademicSessionScope sessionScope,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Accountant dashboard retrieved successfully",
				service.getAccountantDashboard(organizationId, academicSessionId, sessionScope, referenceDate)));
	}

	@RequirePermission(PermissionCode.DASHBOARD_VIEW)
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
	@RequirePermission(PermissionCode.REPORT_VIEW)
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

	@RequirePermission(PermissionCode.REPORT_VIEW)
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

	@RequirePermission(PermissionCode.REPORT_VIEW)
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

	@RequirePermission(PermissionCode.FEES_REPORT_VIEW)
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

	@RequireFeature(PlatformFeature.REPORT_EXPORTS)
	@RequirePermission(PermissionCode.REPORT_EXPORT)
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

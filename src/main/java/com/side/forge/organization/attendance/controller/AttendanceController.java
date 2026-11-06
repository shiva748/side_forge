package com.side.forge.organization.attendance.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.attendance.dto.*;
import com.side.forge.organization.attendance.entity.AttendanceAuditLog.TargetType;
import com.side.forge.organization.attendance.service.AttendanceService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Attendance Management", description = "Track daily and bulk student/staff attendance, corrections, audit history, and reports")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class AttendanceController {

	private final AttendanceService attendanceService;

	@RequirePermission(PermissionCode.ATTENDANCE_MARK)
	@PostMapping("/student-attendance")
	public ResponseEntity<ApiResponse<StudentAttendanceResponse>> markStudentAttendance(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody MarkStudentAttendanceRequest request) {
		StudentAttendanceResponse created = attendanceService.markStudentAttendance(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Student attendance marked successfully", created));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_MARK)
	@PostMapping("/student-attendance/bulk")
	public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> markBulkStudentAttendance(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody BulkStudentAttendanceRequest request) {
		List<StudentAttendanceResponse> created = attendanceService.markBulkStudentAttendance(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Bulk student attendance marked successfully", created));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_UPDATE)
	@PutMapping("/student-attendance/{attendanceId}")
	public ResponseEntity<ApiResponse<StudentAttendanceResponse>> updateStudentAttendance(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long attendanceId,
			@Valid @RequestBody UpdateStudentAttendanceRequest request) {
		StudentAttendanceResponse updated = attendanceService.updateStudentAttendance(
				organizationId, attendanceId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student attendance updated successfully", updated));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/student-attendance")
	public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> getClassAttendance(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@RequestParam(required = false) LocalDate date) {
		List<StudentAttendanceResponse> list = attendanceService.getClassAttendance(
				organizationId, sessionId, classId, date);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class attendance retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@GetMapping("/students/{studentId}/attendance")
	public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> getStudentAttendanceHistory(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		List<StudentAttendanceResponse> list = attendanceService.getStudentAttendanceHistory(
				organizationId, studentId, academicSessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student attendance history retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@GetMapping("/students/{studentId}/attendance/summary")
	public ResponseEntity<ApiResponse<StudentAttendanceSummaryResponse>> getStudentAttendanceSummary(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		StudentAttendanceSummaryResponse summary = attendanceService.getStudentAttendanceSummary(
				organizationId, studentId, academicSessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student attendance summary retrieved successfully", summary));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/student-attendance/report")
	public ResponseEntity<ApiResponse<ClassAttendanceReportResponse>> getClassAttendanceReport(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId) {
		ClassAttendanceReportResponse report = attendanceService.getClassAttendanceReport(
				organizationId, sessionId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class attendance report retrieved successfully", report));
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_MANAGE)
	@PostMapping("/staff-attendance")
	public ResponseEntity<ApiResponse<StaffAttendanceResponse>> markStaffAttendance(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody MarkStaffAttendanceRequest request) {
		StaffAttendanceResponse created = attendanceService.markStaffAttendance(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Staff attendance marked successfully", created));
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_MANAGE)
	@PutMapping("/staff-attendance/{attendanceId}")
	public ResponseEntity<ApiResponse<StaffAttendanceResponse>> updateStaffAttendance(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long attendanceId,
			@Valid @RequestBody UpdateStaffAttendanceRequest request) {
		StaffAttendanceResponse updated = attendanceService.updateStaffAttendance(
				organizationId, attendanceId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff attendance updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_VIEW)
	@GetMapping("/staff-attendance")
	public ResponseEntity<ApiResponse<List<StaffAttendanceResponse>>> getStaffAttendance(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long staffId,
			@RequestParam(required = false) LocalDate date,
			@RequestParam(required = false) @Positive Integer year,
			@RequestParam(required = false) @Min(1) @Max(12) Integer month) {
		List<StaffAttendanceResponse> list = attendanceService.getStaffAttendance(
				organizationId, staffId, date, year, month);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff attendance retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.STAFF_ATTENDANCE_VIEW)
	@GetMapping("/staff/{staffId}/attendance/summary")
	public ResponseEntity<ApiResponse<StaffAttendanceSummaryResponse>> getStaffAttendanceSummary(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long staffId,
			@RequestParam(required = false) @Positive Integer year,
			@RequestParam(required = false) @Min(1) @Max(12) Integer month) {
		StaffAttendanceSummaryResponse summary = attendanceService.getStaffAttendanceSummary(
				organizationId, staffId, year, month);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff attendance summary retrieved successfully", summary));
	}

	@RequirePermission(PermissionCode.ATTENDANCE_VIEW)
	@GetMapping("/attendance-audit-logs/{targetType}/{attendanceRecordId}")
	public ResponseEntity<ApiResponse<List<AttendanceAuditLogResponse>>> getAuditHistory(
			@PathVariable @Positive Long organizationId,
			@PathVariable TargetType targetType,
			@PathVariable @Positive Long attendanceRecordId) {
		List<AttendanceAuditLogResponse> logs = attendanceService.getAuditHistory(
				organizationId, targetType, attendanceRecordId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Attendance audit history retrieved successfully", logs));
	}
}

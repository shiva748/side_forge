package com.side.forge.organization.examination.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.examination.dto.*;
import com.side.forge.organization.examination.dto.CreateGradingScaleRequest.GradingScaleResponse;
import com.side.forge.organization.examination.dto.EnterMarkRequest.BulkMarkEntryRequest;
import com.side.forge.organization.examination.dto.EnterMarkRequest.ExamMarkResponse;
import com.side.forge.organization.examination.dto.ExaminationResponse.ClassExamReportResponse;
import com.side.forge.organization.examination.dto.ExaminationResponse.ReportCardResponse;
import com.side.forge.organization.examination.dto.ScheduleExamSubjectRequest.ExamScheduleResponse;
import com.side.forge.organization.examination.service.ExaminationService;
import com.side.forge.organization.student.profile.dto.StudentResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Examinations & Results", description = "Configure grading scales, examinations, schedules, marks entry, results, and report cards")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class ExaminationController {

	private final ExaminationService examinationService;

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@PostMapping("/grading-scales")
	public ResponseEntity<ApiResponse<GradingScaleResponse>> createGradingScale(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateGradingScaleRequest request) {
		GradingScaleResponse created = examinationService.createGradingScale(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Grading scale created successfully", created));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/grading-scales")
	public ResponseEntity<ApiResponse<List<GradingScaleResponse>>> getGradingScales(
			@PathVariable @Positive Long organizationId) {
		List<GradingScaleResponse> scales = examinationService.getGradingScales(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Grading scales retrieved successfully", scales));
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@PostMapping("/examinations")
	public ResponseEntity<ApiResponse<ExaminationResponse>> createExamination(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateExaminationRequest request) {
		ExaminationResponse created = examinationService.createExamination(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Examination created successfully", created));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/examinations")
	public ResponseEntity<ApiResponse<List<ExaminationResponse>>> getSessionExaminations(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@RequestParam(required = false) @Positive Long classId) {
		List<ExaminationResponse> list = examinationService.getSessionExaminations(
				organizationId, sessionId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Examinations retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/examinations/{examinationId}")
	public ResponseEntity<ApiResponse<ExaminationResponse>> getExaminationById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId) {
		ExaminationResponse exam = examinationService.getExaminationById(organizationId, examinationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Examination retrieved successfully", exam));
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@PostMapping("/examinations/{examinationId}/schedules")
	public ResponseEntity<ApiResponse<ExamScheduleResponse>> scheduleSubject(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId,
			@Valid @RequestBody ScheduleExamSubjectRequest request) {
		ExamScheduleResponse scheduled = examinationService.scheduleSubject(
				organizationId, examinationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Examination subject scheduled successfully", scheduled));
	}

	@RequirePermission(PermissionCode.EXAM_ENTER_MARKS)
	@PostMapping("/examinations/{examinationId}/marks")
	public ResponseEntity<ApiResponse<ExamMarkResponse>> enterOrUpdateMark(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId,
			@Valid @RequestBody EnterMarkRequest request) {
		ExamMarkResponse saved = examinationService.enterOrUpdateMark(organizationId, examinationId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student mark recorded successfully", saved));
	}

	@RequirePermission(PermissionCode.EXAM_ENTER_MARKS)
	@PostMapping("/examinations/{examinationId}/marks/bulk")
	public ResponseEntity<ApiResponse<List<ExamMarkResponse>>> enterBulkMarks(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId,
			@Valid @RequestBody BulkMarkEntryRequest request) {
		List<ExamMarkResponse> saved = examinationService.enterBulkMarks(organizationId, examinationId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Bulk student marks recorded successfully", saved));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/examinations/{examinationId}/marks")
	public ResponseEntity<ApiResponse<List<ExamMarkResponse>>> getExaminationMarks(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId,
			@RequestParam(required = false) @Positive Long subjectId,
			@RequestParam(required = false) @Positive Long studentId) {
		List<ExamMarkResponse> marks = examinationService.getExaminationMarks(
				organizationId, examinationId, subjectId, studentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Examination marks retrieved successfully", marks));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/examinations/{examinationId}/subjects/{subjectId}/missing-marks")
	public ResponseEntity<ApiResponse<List<StudentResponse>>> getMissingMarksStudents(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId,
			@PathVariable @Positive Long subjectId) {
		List<StudentResponse> students = examinationService.getMissingMarksStudents(
				organizationId, examinationId, subjectId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Students with missing marks retrieved successfully", students));
	}

	@RequirePermission(PermissionCode.EXAM_MANAGE)
	@PatchMapping("/examinations/{examinationId}/finalize")
	public ResponseEntity<ApiResponse<ExaminationResponse>> finalizeResults(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId) {
		ExaminationResponse finalized = examinationService.finalizeExaminationResults(organizationId, examinationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Examination results finalized successfully", finalized));
	}

	@RequirePermission(PermissionCode.EXAM_PUBLISH_RESULTS)
	@PatchMapping("/examinations/{examinationId}/publish")
	public ResponseEntity<ApiResponse<ExaminationResponse>> publishResults(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId) {
		ExaminationResponse published = examinationService.publishExaminationResults(organizationId, examinationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Examination results published successfully", published));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/examinations/{examinationId}/students/{studentId}/report-card")
	public ResponseEntity<ApiResponse<ReportCardResponse>> getStudentReportCard(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId,
			@PathVariable @Positive Long studentId) {
		ReportCardResponse reportCard = examinationService.getStudentReportCard(
				organizationId, examinationId, studentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student report card retrieved successfully", reportCard));
	}

	@RequirePermission(PermissionCode.EXAM_VIEW)
	@GetMapping("/examinations/{examinationId}/report")
	public ResponseEntity<ApiResponse<ClassExamReportResponse>> getClassExamReport(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long examinationId) {
		ClassExamReportResponse report = examinationService.getClassExamReport(organizationId, examinationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class examination report retrieved successfully", report));
	}
}

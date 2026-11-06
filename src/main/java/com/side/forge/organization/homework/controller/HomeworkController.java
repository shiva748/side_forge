package com.side.forge.organization.homework.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.homework.dto.HomeworkDtos.*;
import com.side.forge.organization.homework.service.HomeworkService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Homework & Assignments", description = "Create, assign, submit, evaluate, and track homework assignments")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class HomeworkController {

	private final HomeworkService homeworkService;

	@RequirePermission(PermissionCode.HOMEWORK_MANAGE)
	@PostMapping("/homework")
	public ResponseEntity<ApiResponse<HomeworkAssignmentResponse>> createHomework(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateHomeworkRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Homework assignment created successfully",
						homeworkService.createHomework(organizationId, request)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_MANAGE)
	@PutMapping("/homework/{homeworkId}")
	public ResponseEntity<ApiResponse<HomeworkAssignmentResponse>> updateHomework(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long homeworkId,
			@Valid @RequestBody UpdateHomeworkRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework assignment updated successfully",
				homeworkService.updateHomework(organizationId, homeworkId, request)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_MANAGE)
	@DeleteMapping("/homework/{homeworkId}")
	public ResponseEntity<ApiResponse<Void>> deleteHomework(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long homeworkId) {
		homeworkService.deleteHomework(organizationId, homeworkId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework assignment deleted successfully", null));
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/homework/{homeworkId}")
	public ResponseEntity<ApiResponse<HomeworkAssignmentResponse>> getHomeworkById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long homeworkId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework assignment retrieved successfully",
				homeworkService.getHomeworkById(organizationId, homeworkId, referenceDate)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/homework")
	public ResponseEntity<ApiResponse<List<HomeworkAssignmentResponse>>> getSessionHomework(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@RequestParam(required = false) @Positive Long classId,
			@RequestParam(required = false) @Positive Long subjectId,
			@RequestParam(required = false) @Positive Long teacherId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework assignments retrieved successfully",
				homeworkService.getSessionHomework(
						organizationId, sessionId, classId, subjectId, teacherId, referenceDate)));
	}
	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/homework/{homeworkId}/submissions")
	public ResponseEntity<ApiResponse<List<StudentHomeworkSubmissionResponse>>> getHomeworkRosterAndSubmissions(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long homeworkId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework student roster and submissions retrieved successfully",
				homeworkService.getHomeworkRosterAndSubmissions(organizationId, homeworkId, referenceDate)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/students/{studentId}/homework")
	public ResponseEntity<ApiResponse<List<StudentHomeworkSubmissionResponse>>> getStudentHomework(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Student homework retrieved successfully",
				homeworkService.getStudentHomeworkList(organizationId, studentId, academicSessionId, referenceDate)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/homework/my-assignments")
	public ResponseEntity<ApiResponse<List<StudentHomeworkSubmissionResponse>>> getMyHomework(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Student homework retrieved successfully",
				homeworkService.getStudentHomeworkList(organizationId, null, academicSessionId, referenceDate)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_SUBMIT)
	@PostMapping("/homework/{homeworkId}/submissions")
	public ResponseEntity<ApiResponse<StudentHomeworkSubmissionResponse>> submitHomework(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long homeworkId,
			@Valid @RequestBody SubmitHomeworkRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework submitted successfully",
				homeworkService.submitHomework(organizationId, homeworkId, request)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_EVALUATE)
	@PatchMapping("/homework/{homeworkId}/submissions/{submissionId}/evaluate")
	public ResponseEntity<ApiResponse<StudentHomeworkSubmissionResponse>> evaluateSubmission(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long homeworkId,
			@PathVariable @Positive Long submissionId,
			@Valid @RequestBody EvaluateHomeworkSubmissionRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Homework submission evaluated successfully",
				homeworkService.evaluateSubmission(organizationId, homeworkId, submissionId, request)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/homework/dashboard/teacher")
	public ResponseEntity<ApiResponse<TeacherHomeworkDashboardResponse>> getTeacherHomeworkDashboard(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @Positive Long teacherId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher homework dashboard retrieved successfully",
				homeworkService.getTeacherHomeworkDashboard(organizationId, academicSessionId, teacherId, referenceDate)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_VIEW)
	@GetMapping("/homework/dashboard/student")
	public ResponseEntity<ApiResponse<StudentHomeworkDashboardResponse>> getStudentHomeworkDashboard(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @Positive Long studentId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true, "Student homework dashboard retrieved successfully",
				homeworkService.getStudentHomeworkDashboard(organizationId, academicSessionId, studentId, referenceDate)));
	}
}

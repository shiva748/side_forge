package com.side.forge.organization.teacher.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.teacher.dto.*;
import com.side.forge.organization.teacher.service.TeacherAssignmentService;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.STAFF_MANAGEMENT)
@Tag(name = "Teacher Assignments", description = "Manage session-specific teacher-class and teacher-subject assignments")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class TeacherAssignmentController {

	private final TeacherAssignmentService assignmentService;

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PostMapping("/academic-sessions/{sessionId}/classes/{classId}/teachers")
	public ResponseEntity<ApiResponse<TeacherClassAssignmentResponse>> assignTeacherToClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@Valid @RequestBody AssignTeacherClassRequest request) {
		TeacherClassAssignmentResponse created = assignmentService.assignTeacherToClass(
				organizationId, sessionId, classId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Teacher assigned to class successfully", created));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/teachers")
	public ResponseEntity<ApiResponse<List<TeacherClassAssignmentResponse>>> getClassTeachers(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId) {
		List<TeacherClassAssignmentResponse> list = assignmentService.getClassTeachers(
				organizationId, sessionId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class teacher assignments retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PutMapping("/academic-sessions/{sessionId}/classes/{classId}/teachers/{teacherId}")
	public ResponseEntity<ApiResponse<TeacherClassAssignmentResponse>> updateTeacherClassAssignment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long teacherId,
			@Valid @RequestBody UpdateTeacherClassAssignmentRequest request) {
		TeacherClassAssignmentResponse updated = assignmentService.updateTeacherClassAssignment(
				organizationId, sessionId, classId, teacherId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher-class assignment updated successfully", updated));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@DeleteMapping("/academic-sessions/{sessionId}/classes/{classId}/teachers/{teacherId}")
	public ResponseEntity<ApiResponse<Void>> removeTeacherFromClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long teacherId) {
		assignmentService.removeTeacherFromClass(organizationId, sessionId, classId, teacherId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher removed from class successfully"));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/teacher-class-assignments")
	public ResponseEntity<ApiResponse<List<TeacherClassAssignmentResponse>>> getSessionClassAssignments(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		List<TeacherClassAssignmentResponse> list = assignmentService.getSessionClassAssignments(
				organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Session teacher-class assignments retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/teachers/{teacherId}/class-assignments")
	public ResponseEntity<ApiResponse<List<TeacherClassAssignmentResponse>>> getTeacherClassAssignments(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long teacherId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		List<TeacherClassAssignmentResponse> list = assignmentService.getTeacherClassAssignments(
				organizationId, teacherId, academicSessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher class assignments retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PostMapping("/academic-sessions/{sessionId}/classes/{classId}/subjects/{subjectId}/teachers")
	public ResponseEntity<ApiResponse<TeacherSubjectAssignmentResponse>> assignTeacherToSubject(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long subjectId,
			@Valid @RequestBody AssignTeacherSubjectRequest request) {
		TeacherSubjectAssignmentResponse created = assignmentService.assignTeacherToSubject(
				organizationId, sessionId, classId, subjectId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Teacher assigned to subject successfully", created));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/subjects/{subjectId}/teachers")
	public ResponseEntity<ApiResponse<List<TeacherSubjectAssignmentResponse>>> getSubjectTeachersForClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long subjectId) {
		List<TeacherSubjectAssignmentResponse> list = assignmentService.getClassSubjectTeachers(
				organizationId, sessionId, classId, subjectId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subject teachers retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/subject-teachers")
	public ResponseEntity<ApiResponse<List<TeacherSubjectAssignmentResponse>>> getAllClassSubjectTeachers(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId) {
		List<TeacherSubjectAssignmentResponse> list = assignmentService.getClassSubjectTeachers(
				organizationId, sessionId, classId, null);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class subject-teacher assignments retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/subjects/{subjectId}/teachers")
	public ResponseEntity<ApiResponse<List<TeacherSubjectAssignmentResponse>>> getSubjectTeachersInSession(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long subjectId) {
		List<TeacherSubjectAssignmentResponse> list = assignmentService.getSubjectTeachersInSession(
				organizationId, sessionId, subjectId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subject teachers retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PutMapping("/academic-sessions/{sessionId}/classes/{classId}/subjects/{subjectId}/teachers/{teacherId}")
	public ResponseEntity<ApiResponse<TeacherSubjectAssignmentResponse>> updateTeacherSubjectAssignment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long subjectId,
			@PathVariable @Positive Long teacherId,
			@Valid @RequestBody UpdateTeacherSubjectAssignmentRequest request) {
		TeacherSubjectAssignmentResponse updated = assignmentService.updateTeacherSubjectAssignment(
				organizationId, sessionId, classId, subjectId, teacherId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher-subject assignment updated successfully", updated));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@DeleteMapping("/academic-sessions/{sessionId}/classes/{classId}/subjects/{subjectId}/teachers/{teacherId}")
	public ResponseEntity<ApiResponse<Void>> removeTeacherFromSubject(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long subjectId,
			@PathVariable @Positive Long teacherId) {
		assignmentService.removeTeacherFromSubject(organizationId, sessionId, classId, subjectId, teacherId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher removed from subject successfully"));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/teacher-subject-assignments")
	public ResponseEntity<ApiResponse<List<TeacherSubjectAssignmentResponse>>> getSessionSubjectAssignments(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		List<TeacherSubjectAssignmentResponse> list = assignmentService.getSessionSubjectAssignments(
				organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Session teacher-subject assignments retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/teachers/{teacherId}/subject-assignments")
	public ResponseEntity<ApiResponse<List<TeacherSubjectAssignmentResponse>>> getTeacherSubjectAssignments(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long teacherId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @Positive Long classId) {
		List<TeacherSubjectAssignmentResponse> list = assignmentService.getTeacherSubjectAssignments(
				organizationId, teacherId, academicSessionId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher subject assignments retrieved successfully", list));
	}
}

package com.side.forge.organization.student.enrollment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.student.enrollment.dto.*;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.enrollment.service.StudentEnrollmentService;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.service.StudentService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Student Enrollments", description = "Manage student academic enrollments, history, and class directories")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class StudentEnrollmentController {

	private final StudentEnrollmentService enrollmentService;
	private final StudentService studentService;

	@RequirePermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE)
	@PostMapping("/enrollments")
	public ResponseEntity<ApiResponse<StudentEnrollmentResponse>> enrollStudent(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateEnrollmentRequest request) {
		StudentEnrollmentResponse created = enrollmentService.enrollStudent(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Student enrolled successfully", created));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/enrollments")
	public ResponseEntity<ApiResponse<PagedResponse<StudentEnrollmentResponse>>> getEnrollments(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @Positive Long classId,
			@RequestParam(required = false) @Positive Long studentId,
			@RequestParam(required = false) EnrollmentStatus status,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "enrollmentDate") String sortBy,
			@RequestParam(defaultValue = "desc") String sortDir) {
		PagedResponse<StudentEnrollmentResponse> enrollments = enrollmentService.getEnrollments(
				organizationId, academicSessionId, classId, studentId, status, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Enrollments retrieved successfully", enrollments));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/enrollments/{enrollmentId}")
	public ResponseEntity<ApiResponse<StudentEnrollmentResponse>> getEnrollmentById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long enrollmentId) {
		StudentEnrollmentResponse enrollment = enrollmentService.getEnrollmentById(organizationId, enrollmentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Enrollment retrieved successfully", enrollment));
	}

	@RequirePermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE)
	@PutMapping("/enrollments/{enrollmentId}")
	public ResponseEntity<ApiResponse<StudentEnrollmentResponse>> updateEnrollment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long enrollmentId,
			@Valid @RequestBody UpdateEnrollmentRequest request) {
		StudentEnrollmentResponse updated = enrollmentService.updateEnrollment(
				organizationId, enrollmentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Enrollment updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE)
	@PatchMapping("/enrollments/{enrollmentId}/status")
	public ResponseEntity<ApiResponse<StudentEnrollmentResponse>> changeEnrollmentStatus(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long enrollmentId,
			@Valid @RequestBody ChangeEnrollmentStatusRequest request) {
		StudentEnrollmentResponse updated = enrollmentService.changeEnrollmentStatus(
				organizationId, enrollmentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Enrollment status updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/students/{studentId}/enrollments")
	public ResponseEntity<ApiResponse<List<StudentEnrollmentResponse>>> getStudentEnrollmentHistory(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId) {
		List<StudentEnrollmentResponse> history = enrollmentService.getStudentEnrollmentHistory(
				organizationId, studentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student enrollment history retrieved successfully", history));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/enrollments")
	public ResponseEntity<ApiResponse<PagedResponse<StudentEnrollmentResponse>>> getSessionEnrollments(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@RequestParam(required = false) @Positive Long classId,
			@RequestParam(required = false) EnrollmentStatus status,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "enrollmentDate") String sortBy,
			@RequestParam(defaultValue = "asc") String sortDir) {
		PagedResponse<StudentEnrollmentResponse> enrollments = enrollmentService.getEnrollments(
				organizationId, sessionId, classId, null, status, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Session enrollments retrieved successfully", enrollments));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/students")
	public ResponseEntity<ApiResponse<PagedResponse<StudentResponse>>> getClassStudentDirectory(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) StudentStatus status,
			@RequestParam(required = false) Gender gender,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "firstName") String sortBy,
			@RequestParam(defaultValue = "asc") String sortDir) {
		PagedResponse<StudentResponse> directory = studentService.getStudents(
				organizationId, search, null, status, gender, sessionId, classId, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class student directory retrieved successfully", directory));
	}
}

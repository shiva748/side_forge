package com.side.forge.organization.teacher.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.teacher.dto.*;
import com.side.forge.organization.teacher.service.TeacherService;
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
@Tag(name = "Teachers", description = "Manage teacher profiles, professional qualifications, and teacher directory")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/teachers")
@RequiredArgsConstructor
public class TeacherController {

	private final TeacherService teacherService;

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<TeacherResponse>> createTeacher(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateTeacherRequest request) {
		TeacherResponse created = teacherService.createTeacher(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Teacher profile created successfully", created));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<PagedResponse<TeacherResponse>>> getTeachers(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String employeeId,
			@RequestParam(required = false) String department,
			@RequestParam(required = false) String designation,
			@RequestParam(required = false) EmploymentType employmentType,
			@RequestParam(required = false) EmploymentStatus employmentStatus,
			@RequestParam(required = false) String specialization,
			@RequestParam(required = false) Boolean availableForAssignment,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @Positive Long classId,
			@RequestParam(required = false) @Positive Long subjectId,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "id") String sortBy,
			@RequestParam(defaultValue = "asc") String sortDir) {
		PagedResponse<TeacherResponse> teachers = teacherService.getTeachers(
				organizationId, search, employeeId, department, designation,
				employmentType, employmentStatus, specialization, availableForAssignment,
				academicSessionId, classId, subjectId, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teachers retrieved successfully", teachers));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/available")
	public ResponseEntity<ApiResponse<PagedResponse<TeacherResponse>>> getAvailableTeachers(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String specialization,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "id") String sortBy,
			@RequestParam(defaultValue = "asc") String sortDir) {
		PagedResponse<TeacherResponse> available = teacherService.getAvailableTeachers(
				organizationId, search, specialization, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Available teachers retrieved successfully", available));
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@GetMapping("/{teacherId}")
	public ResponseEntity<ApiResponse<TeacherResponse>> getTeacherById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long teacherId) {
		TeacherResponse teacher = teacherService.getTeacherById(organizationId, teacherId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher retrieved successfully", teacher));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PutMapping("/{teacherId}")
	public ResponseEntity<ApiResponse<TeacherResponse>> updateTeacherProfile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long teacherId,
			@Valid @RequestBody UpdateTeacherProfileRequest request) {
		TeacherResponse updated = teacherService.updateTeacherProfile(organizationId, teacherId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher profile updated successfully", updated));
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@PatchMapping("/{teacherId}/status")
	public ResponseEntity<ApiResponse<TeacherResponse>> changeTeacherStatus(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long teacherId,
			@Valid @RequestBody ChangeTeacherStatusRequest request) {
		TeacherResponse updated = teacherService.changeTeacherStatus(organizationId, teacherId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher status updated successfully", updated));
	}
}

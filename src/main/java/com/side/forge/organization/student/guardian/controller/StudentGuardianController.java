package com.side.forge.organization.student.guardian.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.student.guardian.dto.LinkStudentGuardianRequest;
import com.side.forge.organization.student.guardian.dto.StudentGuardianResponse;
import com.side.forge.organization.student.guardian.dto.UpdateStudentGuardianRequest;
import com.side.forge.organization.student.guardian.service.GuardianService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Student Guardians", description = "Manage relationships between students and guardians")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/students/{studentId}/guardians")
@RequiredArgsConstructor
public class StudentGuardianController {

	private final GuardianService guardianService;

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<StudentGuardianResponse>> linkGuardian(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@Valid @RequestBody LinkStudentGuardianRequest request) {
		StudentGuardianResponse linked = guardianService.linkGuardianToStudent(
				organizationId, studentId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Guardian associated with student successfully", linked));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<StudentGuardianResponse>>> getStudentGuardians(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId) {
		List<StudentGuardianResponse> guardians = guardianService.getStudentGuardians(organizationId, studentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student guardians retrieved successfully", guardians));
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@PutMapping("/{guardianId}")
	public ResponseEntity<ApiResponse<StudentGuardianResponse>> updateStudentGuardianLink(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long guardianId,
			@Valid @RequestBody UpdateStudentGuardianRequest request) {
		StudentGuardianResponse updated = guardianService.updateStudentGuardianLink(
				organizationId, studentId, guardianId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student-guardian relationship updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@DeleteMapping("/{guardianId}")
	public ResponseEntity<ApiResponse<Void>> unlinkGuardian(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long guardianId) {
		guardianService.unlinkGuardianFromStudent(organizationId, studentId, guardianId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Guardian association removed successfully"));
	}
}

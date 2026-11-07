package com.side.forge.organization.student.guardian.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
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
import com.side.forge.organization.student.guardian.dto.CreateGuardianRequest;
import com.side.forge.organization.student.guardian.dto.GuardianResponse;
import com.side.forge.organization.student.guardian.dto.GuardianStudentLinkResponse;
import com.side.forge.organization.student.guardian.dto.UpdateGuardianRequest;
import com.side.forge.organization.student.guardian.service.GuardianService;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.STUDENT_MANAGEMENT)
@Tag(name = "Guardians", description = "Manage parent and guardian records within an organization")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/guardians")
@RequiredArgsConstructor
public class GuardianController {

	private final GuardianService guardianService;

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<GuardianResponse>> createGuardian(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateGuardianRequest request) {
		GuardianResponse created = guardianService.createGuardian(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Guardian created successfully", created));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<GuardianResponse>>> getGuardians(
			@PathVariable @Positive Long organizationId) {
		List<GuardianResponse> guardians = guardianService.getGuardians(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Guardians retrieved successfully", guardians));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/{guardianId}")
	public ResponseEntity<ApiResponse<GuardianResponse>> getGuardianById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long guardianId) {
		GuardianResponse guardian = guardianService.getGuardianById(organizationId, guardianId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Guardian retrieved successfully", guardian));
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@PutMapping("/{guardianId}")
	public ResponseEntity<ApiResponse<GuardianResponse>> updateGuardian(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long guardianId,
			@Valid @RequestBody UpdateGuardianRequest request) {
		GuardianResponse updated = guardianService.updateGuardian(organizationId, guardianId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Guardian updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/{guardianId}/students")
	public ResponseEntity<ApiResponse<List<GuardianStudentLinkResponse>>> getGuardianStudents(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long guardianId) {
		List<GuardianStudentLinkResponse> students = guardianService.getGuardianStudents(organizationId, guardianId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Associated students retrieved successfully", students));
	}
}

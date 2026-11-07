package com.side.forge.organization.academic.schoolclass.controller;

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
import com.side.forge.organization.academic.schoolclass.dto.CreateSchoolClassRequest;
import com.side.forge.organization.academic.schoolclass.dto.SchoolClassResponse;
import com.side.forge.organization.academic.schoolclass.dto.UpdateSchoolClassRequest;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.ACADEMIC_MANAGEMENT)
@Tag(name = "Classes", description = "Manage reusable organization classes across academic sessions")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/classes")
@RequiredArgsConstructor
public class SchoolClassController {

	private final SchoolClassService schoolClassService;

	@RequirePermission(PermissionCode.CLASS_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<SchoolClassResponse>> createClass(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateSchoolClassRequest request) {
		SchoolClassResponse created = schoolClassService.createClass(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Class created successfully", created));
	}

	@RequirePermission(PermissionCode.CLASS_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<SchoolClassResponse>>> getClasses(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) Boolean active) {
		List<SchoolClassResponse> classes = schoolClassService.getClasses(organizationId, active);
		return ResponseEntity.ok(new ApiResponse<>(true, "Classes retrieved successfully", classes));
	}

	@RequirePermission(PermissionCode.CLASS_VIEW)
	@GetMapping("/{classId}")
	public ResponseEntity<ApiResponse<SchoolClassResponse>> getClassById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long classId) {
		SchoolClassResponse schoolClass = schoolClassService.getClassById(organizationId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class retrieved successfully", schoolClass));
	}

	@RequirePermission(PermissionCode.CLASS_MANAGE)
	@PutMapping("/{classId}")
	public ResponseEntity<ApiResponse<SchoolClassResponse>> updateClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long classId,
			@Valid @RequestBody UpdateSchoolClassRequest request) {
		SchoolClassResponse updated = schoolClassService.updateClass(organizationId, classId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class updated successfully", updated));
	}

	@RequirePermission(PermissionCode.CLASS_MANAGE)
	@PatchMapping("/{classId}/deactivate")
	public ResponseEntity<ApiResponse<SchoolClassResponse>> deactivateClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long classId) {
		SchoolClassResponse deactivated = schoolClassService.deactivateClass(organizationId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class deactivated successfully", deactivated));
	}
}

package com.side.forge.organization.academic.subject.controller;

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
import com.side.forge.organization.academic.subject.dto.CreateSubjectRequest;
import com.side.forge.organization.academic.subject.dto.SubjectResponse;
import com.side.forge.organization.academic.subject.dto.UpdateSubjectRequest;
import com.side.forge.organization.academic.subject.service.SubjectService;
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
@Tag(name = "Subjects", description = "Manage reusable organization subjects across academic sessions")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/subjects")
@RequiredArgsConstructor
public class SubjectController {

	private final SubjectService subjectService;

	@RequirePermission(PermissionCode.SUBJECT_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<SubjectResponse>> createSubject(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateSubjectRequest request) {
		SubjectResponse created = subjectService.createSubject(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Subject created successfully", created));
	}

	@RequirePermission(PermissionCode.SUBJECT_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<SubjectResponse>>> getSubjects(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) Boolean active) {
		List<SubjectResponse> subjects = subjectService.getSubjects(organizationId, active);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subjects retrieved successfully", subjects));
	}

	@RequirePermission(PermissionCode.SUBJECT_VIEW)
	@GetMapping("/{subjectId}")
	public ResponseEntity<ApiResponse<SubjectResponse>> getSubjectById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long subjectId) {
		SubjectResponse subject = subjectService.getSubjectById(organizationId, subjectId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subject retrieved successfully", subject));
	}

	@RequirePermission(PermissionCode.SUBJECT_MANAGE)
	@PutMapping("/{subjectId}")
	public ResponseEntity<ApiResponse<SubjectResponse>> updateSubject(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long subjectId,
			@Valid @RequestBody UpdateSubjectRequest request) {
		SubjectResponse updated = subjectService.updateSubject(organizationId, subjectId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subject updated successfully", updated));
	}

	@RequirePermission(PermissionCode.SUBJECT_MANAGE)
	@PatchMapping("/{subjectId}/deactivate")
	public ResponseEntity<ApiResponse<SubjectResponse>> deactivateSubject(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long subjectId) {
		SubjectResponse deactivated = subjectService.deactivateSubject(organizationId, subjectId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subject deactivated successfully", deactivated));
	}
}

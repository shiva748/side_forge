package com.side.forge.organization.academic.session.controller;

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
import com.side.forge.organization.academic.session.dto.AcademicSessionResponse;
import com.side.forge.organization.academic.session.dto.CreateAcademicSessionRequest;
import com.side.forge.organization.academic.session.dto.UpdateAcademicSessionRequest;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
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
@Tag(name = "Academic Sessions", description = "Manage organization academic sessions and lifecycle")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/academic-sessions")
@RequiredArgsConstructor
public class AcademicSessionController {

	private final AcademicSessionService academicSessionService;

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<AcademicSessionResponse>> createSession(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateAcademicSessionRequest request) {
		AcademicSessionResponse created = academicSessionService.createSession(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Academic session created successfully", created));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<AcademicSessionResponse>>> getSessions(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) AcademicSessionStatus status) {
		List<AcademicSessionResponse> sessions = academicSessionService.getSessions(organizationId, status);
		return ResponseEntity.ok(new ApiResponse<>(true, "Academic sessions retrieved successfully", sessions));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_VIEW)
	@GetMapping("/{sessionId}")
	public ResponseEntity<ApiResponse<AcademicSessionResponse>> getSession(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		AcademicSessionResponse session = academicSessionService.getSession(organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Academic session retrieved successfully", session));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@PutMapping("/{sessionId}")
	public ResponseEntity<ApiResponse<AcademicSessionResponse>> updateSession(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@Valid @RequestBody UpdateAcademicSessionRequest request) {
		AcademicSessionResponse updated = academicSessionService.updateSession(organizationId, sessionId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Academic session updated successfully", updated));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@PatchMapping("/{sessionId}/start")
	public ResponseEntity<ApiResponse<AcademicSessionResponse>> startSession(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		AcademicSessionResponse started = academicSessionService.startSession(organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Academic session started successfully", started));
	}

	@RequirePermission(PermissionCode.ACADEMIC_SESSION_MANAGE)
	@PatchMapping("/{sessionId}/complete")
	public ResponseEntity<ApiResponse<AcademicSessionResponse>> completeSession(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		AcademicSessionResponse completed = academicSessionService.completeSession(organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Academic session completed successfully", completed));
	}
}

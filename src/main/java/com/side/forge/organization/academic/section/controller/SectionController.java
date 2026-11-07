package com.side.forge.organization.academic.section.controller;

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
import com.side.forge.organization.academic.section.dto.CreateSectionRequest;
import com.side.forge.organization.academic.section.dto.SectionResponse;
import com.side.forge.organization.academic.section.dto.UpdateSectionRequest;
import com.side.forge.organization.academic.section.service.SectionService;
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
@Tag(name = "Sections", description = "Manage academic-session-specific sections for reusable classes")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/academic-sessions/{sessionId}/sections")
@RequiredArgsConstructor
public class SectionController {

	private final SectionService sectionService;

	@RequirePermission(PermissionCode.SECTION_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<SectionResponse>> createSection(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@Valid @RequestBody CreateSectionRequest request) {
		SectionResponse created = sectionService.createSection(organizationId, sessionId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Section created successfully", created));
	}

	@RequirePermission(PermissionCode.SECTION_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<SectionResponse>>> getSections(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@RequestParam(required = false) @Positive Long classId,
			@RequestParam(required = false) Boolean active) {
		List<SectionResponse> sections = sectionService.getSections(organizationId, sessionId, classId, active);
		return ResponseEntity.ok(new ApiResponse<>(true, "Sections retrieved successfully", sections));
	}

	@RequirePermission(PermissionCode.SECTION_VIEW)
	@GetMapping("/{sectionId}")
	public ResponseEntity<ApiResponse<SectionResponse>> getSectionById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long sectionId) {
		SectionResponse section = sectionService.getSectionById(organizationId, sessionId, sectionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Section retrieved successfully", section));
	}

	@RequirePermission(PermissionCode.SECTION_MANAGE)
	@PutMapping("/{sectionId}")
	public ResponseEntity<ApiResponse<SectionResponse>> updateSection(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long sectionId,
			@Valid @RequestBody UpdateSectionRequest request) {
		SectionResponse updated = sectionService.updateSection(organizationId, sessionId, sectionId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Section updated successfully", updated));
	}

	@RequirePermission(PermissionCode.SECTION_MANAGE)
	@PatchMapping("/{sectionId}/deactivate")
	public ResponseEntity<ApiResponse<SectionResponse>> deactivateSection(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long sectionId) {
		SectionResponse deactivated = sectionService.deactivateSection(organizationId, sessionId, sectionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Section deactivated successfully", deactivated));
	}
}

package com.side.forge.organization.academic.classsubject.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.academic.classsubject.dto.AssignClassSubjectRequest;
import com.side.forge.organization.academic.classsubject.dto.ClassSubjectResponse;
import com.side.forge.organization.academic.classsubject.service.ClassSubjectService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Class Subjects", description = "Manage session-specific subject assignments for classes")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/academic-sessions/{sessionId}/classes/{classId}/subjects")
@RequiredArgsConstructor
public class ClassSubjectController {

	private final ClassSubjectService classSubjectService;

	@RequirePermission(PermissionCode.CLASS_SUBJECT_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<ClassSubjectResponse>> assignSubjectToClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@Valid @RequestBody AssignClassSubjectRequest request) {
		ClassSubjectResponse created = classSubjectService.assignSubjectToClass(
				organizationId, sessionId, classId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Subject assigned to class successfully", created));
	}

	@RequirePermission(PermissionCode.CLASS_SUBJECT_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<List<ClassSubjectResponse>>> getClassSubjects(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId) {
		List<ClassSubjectResponse> assignments = classSubjectService.getClassSubjects(
				organizationId, sessionId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class subjects retrieved successfully", assignments));
	}

	@RequirePermission(PermissionCode.CLASS_SUBJECT_MANAGE)
	@DeleteMapping("/{subjectId}")
	public ResponseEntity<ApiResponse<Void>> removeSubjectFromClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@PathVariable @Positive Long subjectId) {
		classSubjectService.removeSubjectFromClass(organizationId, sessionId, classId, subjectId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Subject removed from class successfully"));
	}
}

package com.side.forge.organization.student.profile.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.student.profile.dto.ChangeStudentStatusRequest;
import com.side.forge.organization.student.profile.dto.CreateStudentRequest;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.dto.UpdateStudentRequest;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.service.StudentService;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Students", description = "Manage organization student profiles and student directory")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/students")
@RequiredArgsConstructor
public class StudentController {

	private final StudentService studentService;

	@RequirePermission(PermissionCode.STUDENT_CREATE)
	@PostMapping
	public ResponseEntity<ApiResponse<StudentResponse>> createStudent(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateStudentRequest request) {
		StudentResponse created = studentService.createStudent(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Student registered successfully", created));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<PagedResponse<StudentResponse>>> getStudents(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String admissionNumber,
			@RequestParam(required = false) StudentStatus status,
			@RequestParam(required = false) Gender gender,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @Positive Long classId,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "firstName") String sortBy,
			@RequestParam(defaultValue = "asc") String sortDir) {
		PagedResponse<StudentResponse> students = studentService.getStudents(
				organizationId, search, admissionNumber, status, gender,
				academicSessionId, classId, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Students retrieved successfully", students));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@GetMapping("/{studentId}")
	public ResponseEntity<ApiResponse<StudentResponse>> getStudentById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId) {
		StudentResponse student = studentService.getStudentById(organizationId, studentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student retrieved successfully", student));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@PutMapping("/{studentId}")
	public ResponseEntity<ApiResponse<StudentResponse>> updateStudent(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@Valid @RequestBody UpdateStudentRequest request) {
		StudentResponse updated = studentService.updateStudent(organizationId, studentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@PatchMapping("/{studentId}/status")
	public ResponseEntity<ApiResponse<StudentResponse>> changeStudentStatus(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@Valid @RequestBody ChangeStudentStatusRequest request) {
		StudentResponse updated = studentService.changeStudentStatus(organizationId, studentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student status updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@PostMapping(value = "/{studentId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> uploadStudentPhoto(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam("file") MultipartFile file) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Student photo uploaded successfully",
						studentService.uploadStudentPhoto(organizationId, studentId, file)));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@PostMapping(value = "/{studentId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> uploadStudentDocument(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam("file") MultipartFile file) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Student document uploaded successfully",
						studentService.uploadStudentDocument(organizationId, studentId, file)));
	}
}

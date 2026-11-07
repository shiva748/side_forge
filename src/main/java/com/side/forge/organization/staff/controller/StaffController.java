package com.side.forge.organization.staff.controller;

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
import com.side.forge.organization.staff.dto.ChangeStaffStatusRequest;
import com.side.forge.organization.staff.dto.CreateStaffRequest;
import com.side.forge.organization.staff.dto.LinkStaffUserRequest;
import com.side.forge.organization.staff.dto.StaffResponse;
import com.side.forge.organization.staff.dto.UpdateStaffRequest;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.staff.service.StaffService;
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
@Tag(name = "Staff", description = "Manage organization employees, staff directory, and employment lifecycle")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}/staff")
@RequiredArgsConstructor
public class StaffController {

	private final StaffService staffService;

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@PostMapping
	public ResponseEntity<ApiResponse<StaffResponse>> createStaff(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateStaffRequest request) {
		StaffResponse created = staffService.createStaff(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Staff member registered successfully", created));
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@GetMapping
	public ResponseEntity<ApiResponse<PagedResponse<StaffResponse>>> getStaffList(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String employeeId,
			@RequestParam(required = false) String department,
			@RequestParam(required = false) String designation,
			@RequestParam(required = false) EmploymentType employmentType,
			@RequestParam(required = false) EmploymentStatus employmentStatus,
			@RequestParam(required = false) Boolean teachingStaff,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "firstName") String sortBy,
			@RequestParam(defaultValue = "asc") String sortDir) {
		PagedResponse<StaffResponse> staffPage = staffService.getStaffList(
				organizationId, search, employeeId, department, designation,
				employmentType, employmentStatus, teachingStaff, page, size, sortBy, sortDir);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff members retrieved successfully", staffPage));
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@GetMapping("/{staffId}")
	public ResponseEntity<ApiResponse<StaffResponse>> getStaffById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long staffId) {
		StaffResponse staff = staffService.getStaffById(organizationId, staffId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff member retrieved successfully", staff));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@PutMapping("/{staffId}")
	public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long staffId,
			@Valid @RequestBody UpdateStaffRequest request) {
		StaffResponse updated = staffService.updateStaff(organizationId, staffId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff member updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@PatchMapping("/{staffId}/status")
	public ResponseEntity<ApiResponse<StaffResponse>> changeStaffStatus(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long staffId,
			@Valid @RequestBody ChangeStaffStatusRequest request) {
		StaffResponse updated = staffService.changeStaffStatus(organizationId, staffId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff employment status updated successfully", updated));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@PutMapping("/{staffId}/user-account")
	public ResponseEntity<ApiResponse<StaffResponse>> associateUserAccount(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long staffId,
			@Valid @RequestBody LinkStaffUserRequest request) {
		StaffResponse updated = staffService.associateUserAccount(organizationId, staffId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Staff user account association updated successfully", updated));
	}
}

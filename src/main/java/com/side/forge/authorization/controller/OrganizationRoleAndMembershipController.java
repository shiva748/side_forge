package com.side.forge.authorization.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.service.RoleAssignmentService;
import com.side.forge.authorization.service.RoleAssignmentService.*;
import com.side.forge.common.dto.ApiResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@Tag(name = "Organization Roles & Memberships", description = "Manage organization roles, custom role permissions, and member role assignments")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class OrganizationRoleAndMembershipController {

	public record AssignMemberRoleRequest(@NotBlank String roleCode) {
	}

	private final RoleAssignmentService roleAssignmentService;

	@GetMapping("/roles")
	public ResponseEntity<ApiResponse<List<OrganizationRoleDto>>> listRoles(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization roles retrieved successfully",
				roleAssignmentService.listOrganizationRoles(organizationId)));
	}

	@GetMapping("/permissions")
	public ResponseEntity<ApiResponse<List<PermissionDto>>> listPermissions(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization permissions retrieved successfully",
				roleAssignmentService.listOrganizationPermissions(organizationId)));
	}

	@PostMapping("/roles")
	public ResponseEntity<ApiResponse<OrganizationRoleDto>> createCustomRole(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateCustomRoleRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>(
				true,
				"Custom organization role created successfully",
				roleAssignmentService.createCustomOrganizationRole(organizationId, request)));
	}

	@PutMapping("/roles/{roleId}")
	public ResponseEntity<ApiResponse<OrganizationRoleDto>> updateCustomRole(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long roleId,
			@Valid @RequestBody UpdateCustomRoleRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Custom organization role updated successfully",
				roleAssignmentService.updateCustomOrganizationRole(organizationId, roleId, request)));
	}

	@DeleteMapping("/roles/{roleId}")
	public ResponseEntity<ApiResponse<Void>> deleteCustomRole(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long roleId) {
		roleAssignmentService.deleteCustomOrganizationRole(organizationId, roleId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Custom organization role deleted successfully", null));
	}

	@GetMapping("/memberships")
	public ResponseEntity<ApiResponse<List<OrganizationMemberSummaryDto>>> listMemberships(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true,
				"Organization memberships retrieved successfully",
				roleAssignmentService.listOrganizationMemberships(organizationId)));
	}

	@PostMapping("/memberships/{userId}/roles")
	public ResponseEntity<ApiResponse<Void>> assignRoleToMember(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long userId,
			@Valid @RequestBody AssignMemberRoleRequest request) {
		roleAssignmentService.assignOrganizationRole(userId, organizationId, request.roleCode());
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization role assigned successfully", null));
	}

	@DeleteMapping("/memberships/{userId}/roles/{roleCode}")
	public ResponseEntity<ApiResponse<Void>> revokeRoleFromMember(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long userId,
			@PathVariable @NotBlank String roleCode) {
		roleAssignmentService.revokeOrganizationRole(userId, organizationId, roleCode);
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization role revoked successfully", null));
	}

	@PatchMapping("/memberships/{userId}/suspend")
	public ResponseEntity<ApiResponse<Void>> suspendMembership(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long userId) {
		roleAssignmentService.suspendMembership(userId, organizationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization membership suspended successfully", null));
	}

	@PatchMapping("/memberships/{userId}/activate")
	public ResponseEntity<ApiResponse<Void>> activateMembership(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long userId) {
		roleAssignmentService.activateMembership(userId, organizationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization membership activated successfully", null));
	}

	@PatchMapping("/memberships/{userId}/revoke")
	public ResponseEntity<ApiResponse<Void>> revokeMembership(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long userId) {
		roleAssignmentService.revokeMembership(userId, organizationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Organization membership revoked successfully", null));
	}
}

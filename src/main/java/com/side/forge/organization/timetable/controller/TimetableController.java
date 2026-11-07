package com.side.forge.organization.timetable.controller;

import java.time.DayOfWeek;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.teacher.dto.TeacherResponse;
import com.side.forge.organization.timetable.dto.*;
import com.side.forge.organization.timetable.service.TimetableService;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.TIMETABLE)
@Tag(name = "Timetable Management", description = "Configure school timetable structures, periods, class schedules, and teacher timetables")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class TimetableController {

	private final TimetableService timetableService;

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PostMapping("/timetable-configs")
	public ResponseEntity<ApiResponse<TimetableConfigResponse>> createConfig(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateTimetableConfigRequest request) {
		TimetableConfigResponse created = timetableService.createConfig(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Timetable configuration created successfully", created));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/timetable-configs")
	public ResponseEntity<ApiResponse<List<TimetableConfigResponse>>> getConfigs(
			@PathVariable @Positive Long organizationId) {
		List<TimetableConfigResponse> configs = timetableService.getConfigs(organizationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable configurations retrieved successfully", configs));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/timetable-configs/{configId}")
	public ResponseEntity<ApiResponse<TimetableConfigResponse>> getConfigById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long configId) {
		TimetableConfigResponse config = timetableService.getConfigById(organizationId, configId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable configuration retrieved successfully", config));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PutMapping("/timetable-configs/{configId}")
	public ResponseEntity<ApiResponse<TimetableConfigResponse>> updateConfig(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long configId,
			@Valid @RequestBody UpdateTimetableConfigRequest request) {
		TimetableConfigResponse updated = timetableService.updateConfig(organizationId, configId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable configuration updated successfully", updated));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PostMapping("/timetable-configs/{configId}/periods")
	public ResponseEntity<ApiResponse<TimetablePeriodResponse>> addPeriod(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long configId,
			@Valid @RequestBody CreateTimetablePeriodRequest request) {
		TimetablePeriodResponse created = timetableService.addPeriod(organizationId, configId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Timetable period created successfully", created));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/timetable-configs/{configId}/periods")
	public ResponseEntity<ApiResponse<List<TimetablePeriodResponse>>> getPeriods(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long configId) {
		List<TimetablePeriodResponse> periods = timetableService.getPeriods(organizationId, configId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable periods retrieved successfully", periods));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PutMapping("/timetable-configs/{configId}/periods/{periodId}")
	public ResponseEntity<ApiResponse<TimetablePeriodResponse>> updatePeriod(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long configId,
			@PathVariable @Positive Long periodId,
			@Valid @RequestBody UpdateTimetablePeriodRequest request) {
		TimetablePeriodResponse updated = timetableService.updatePeriod(organizationId, configId, periodId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable period updated successfully", updated));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PostMapping("/timetables")
	public ResponseEntity<ApiResponse<ClassTimetableResponse>> createClassTimetable(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateClassTimetableRequest request) {
		ClassTimetableResponse created = timetableService.createClassTimetable(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Class timetable created successfully", created));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/timetables/{timetableId}")
	public ResponseEntity<ApiResponse<ClassTimetableResponse>> getClassTimetableById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long timetableId,
			@RequestParam(required = false) DayOfWeek dayOfWeek) {
		ClassTimetableResponse timetable = timetableService.getClassTimetableById(
				organizationId, timetableId, dayOfWeek);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class timetable retrieved successfully", timetable));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/timetables")
	public ResponseEntity<ApiResponse<List<ClassTimetableResponse>>> getSessionTimetables(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		List<ClassTimetableResponse> list = timetableService.getSessionTimetables(organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Session timetables retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/classes/{classId}/timetable")
	public ResponseEntity<ApiResponse<ClassTimetableResponse>> getClassTimetableBySessionAndClass(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long classId,
			@RequestParam(required = false) DayOfWeek dayOfWeek) {
		ClassTimetableResponse timetable = timetableService.getClassTimetableBySessionAndClass(
				organizationId, sessionId, classId, dayOfWeek);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class timetable retrieved successfully", timetable));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PostMapping("/timetables/{timetableId}/slots")
	public ResponseEntity<ApiResponse<TimetableSlotResponse>> addSlot(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long timetableId,
			@Valid @RequestBody CreateTimetableSlotRequest request) {
		TimetableSlotResponse created = timetableService.addSlot(organizationId, timetableId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Teaching period scheduled successfully", created));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@PutMapping("/timetables/{timetableId}/slots/{slotId}")
	public ResponseEntity<ApiResponse<TimetableSlotResponse>> updateSlot(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long timetableId,
			@PathVariable @Positive Long slotId,
			@Valid @RequestBody UpdateTimetableSlotRequest request) {
		TimetableSlotResponse updated = timetableService.updateSlot(organizationId, timetableId, slotId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Scheduled period updated successfully", updated));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@DeleteMapping("/timetables/{timetableId}/slots/{slotId}")
	public ResponseEntity<ApiResponse<Void>> removeSlot(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long timetableId,
			@PathVariable @Positive Long slotId) {
		timetableService.removeSlot(organizationId, timetableId, slotId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Scheduled period removed successfully"));
	}

	@RequirePermission(PermissionCode.TIMETABLE_PUBLISH)
	@PatchMapping("/timetables/{timetableId}/publish")
	public ResponseEntity<ApiResponse<ClassTimetableResponse>> publishTimetable(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long timetableId) {
		ClassTimetableResponse published = timetableService.publishTimetable(organizationId, timetableId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable published successfully", published));
	}

	@RequirePermission(PermissionCode.TIMETABLE_PUBLISH)
	@PatchMapping("/timetables/{timetableId}/reopen")
	public ResponseEntity<ApiResponse<ClassTimetableResponse>> reopenTimetable(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long timetableId) {
		ClassTimetableResponse reopened = timetableService.reopenTimetableForRevision(organizationId, timetableId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Timetable reopened for revision successfully", reopened));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/teachers/{teacherId}/timetable")
	public ResponseEntity<ApiResponse<List<TimetableSlotResponse>>> getTeacherTimetable(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long teacherId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) DayOfWeek dayOfWeek) {
		List<TimetableSlotResponse> slots = timetableService.getTeacherTimetable(
				organizationId, teacherId, academicSessionId, dayOfWeek);
		return ResponseEntity.ok(new ApiResponse<>(true, "Teacher timetable retrieved successfully", slots));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/timetables/unscheduled-teachers")
	public ResponseEntity<ApiResponse<List<TeacherResponse>>> getUnscheduledTeachers(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		List<TeacherResponse> teachers = timetableService.getUnscheduledTeachers(organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Unscheduled teachers retrieved successfully", teachers));
	}
}

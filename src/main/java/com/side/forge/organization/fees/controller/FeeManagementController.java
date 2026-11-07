package com.side.forge.organization.fees.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.fees.dto.*;
import com.side.forge.organization.fees.dto.CreateClassFeeStructureRequest.*;
import com.side.forge.organization.fees.dto.GenerateFeeDemandsRequest.*;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.*;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.SessionFeeDashboardReportResponse;
import com.side.forge.organization.fees.service.FeeManagementService;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.FEES_AND_FINANCE)
@Tag(name = "Fees & Finance", description = "Configure class fee structures, manage student fee demands, concessions, manual payments, receipts, reversals/refunds, and financial reports")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class FeeManagementController {

	private final FeeManagementService feeService;

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PostMapping("/fee-structures")
	public ResponseEntity<ApiResponse<ClassFeeStructureResponse>> createFeeStructure(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody CreateClassFeeStructureRequest request) {
		ClassFeeStructureResponse created = feeService.createFeeStructure(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Class fee structure created successfully", created));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PutMapping("/fee-structures/{structureId}")
	public ResponseEntity<ApiResponse<ClassFeeStructureResponse>> updateDraftFeeStructure(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long structureId,
			@Valid @RequestBody CreateClassFeeStructureRequest request) {
		ClassFeeStructureResponse updated = feeService.updateDraftFeeStructure(
				organizationId, structureId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Draft fee structure updated successfully", updated));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PatchMapping("/fee-structures/{structureId}/publish")
	public ResponseEntity<ApiResponse<ClassFeeStructureResponse>> publishFeeStructure(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long structureId) {
		ClassFeeStructureResponse published = feeService.publishFeeStructure(organizationId, structureId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Class fee structure published successfully", published));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PostMapping("/fee-structures/{structureId}/revisions")
	public ResponseEntity<ApiResponse<ClassFeeStructureResponse>> reviseFeeStructure(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long structureId,
			@Valid @RequestBody ReviseFeeStructureRequest request) {
		ClassFeeStructureResponse revised = feeService.reviseFeeStructure(organizationId, structureId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Fee structure revision created and published successfully", revised));
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/fee-structures")
	public ResponseEntity<ApiResponse<List<ClassFeeStructureResponse>>> getSessionFeeStructures(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@RequestParam(required = false) @Positive Long classId) {
		List<ClassFeeStructureResponse> list = feeService.getSessionFeeStructures(
				organizationId, sessionId, classId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Fee structures retrieved successfully", list));
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@GetMapping("/fee-structures/{structureId}")
	public ResponseEntity<ApiResponse<ClassFeeStructureResponse>> getFeeStructureById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long structureId) {
		ClassFeeStructureResponse response = feeService.getFeeStructureById(organizationId, structureId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Fee structure retrieved successfully", response));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PostMapping("/enrollments/{enrollmentId}/generate-fees")
	public ResponseEntity<ApiResponse<List<StudentFeeDemandResponse>>> generateDemandsForEnrollment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long enrollmentId,
			@Valid @RequestBody(required = false) GenerateFeeDemandsRequest request) {
		List<StudentFeeDemandResponse> demands = feeService.generateDemandsForEnrollment(
				organizationId, enrollmentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student fee demands generated successfully", demands));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PostMapping("/students/{studentId}/concessions")
	public ResponseEntity<ApiResponse<ConcessionResponse>> applyConcession(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@Valid @RequestBody ApplyConcessionRequest request) {
		ConcessionResponse applied = feeService.applyConcession(organizationId, studentId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Student fee concession applied successfully", applied));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PatchMapping("/fee-demands/{demandId}/waive")
	public ResponseEntity<ApiResponse<StudentFeeDemandResponse>> waiveDemand(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long demandId,
			@Valid @RequestBody WaiveDemandRequest request) {
		StudentFeeDemandResponse waived = feeService.waiveDemand(organizationId, demandId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Fee demand waived successfully", waived));
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@PostMapping("/academic-sessions/{sessionId}/fee-demands/evaluate-late-fees")
	public ResponseEntity<ApiResponse<List<StudentFeeDemandResponse>>> evaluateAndApplyLateFees(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@Valid @RequestBody(required = false) ApplyLateFeeRequest request) {
		List<StudentFeeDemandResponse> updated = feeService.evaluateAndApplyLateFees(
				organizationId, sessionId, request != null ? request.evaluationDate() : null);
		return ResponseEntity.ok(new ApiResponse<>(true, "Late fees evaluated and applied successfully", updated));
	}

	@RequirePermission(PermissionCode.FEES_COLLECT)
	@PostMapping("/fee-payments")
	public ResponseEntity<ApiResponse<FeePaymentReceiptResponse>> recordPayment(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody RecordFeePaymentRequest request) {
		FeePaymentReceiptResponse receipt = feeService.recordPayment(organizationId, request);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Fee payment recorded and receipt generated successfully", receipt));
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@GetMapping("/fee-payments/{paymentId}")
	public ResponseEntity<ApiResponse<FeePaymentReceiptResponse>> getReceiptById(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long paymentId) {
		FeePaymentReceiptResponse receipt = feeService.getReceiptById(organizationId, paymentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Fee payment receipt retrieved successfully", receipt));
	}

	@RequirePermission(PermissionCode.FEES_REFUND)
	@PostMapping("/fee-payments/{paymentId}/reverse")
	public ResponseEntity<ApiResponse<FeePaymentReceiptResponse>> reversePayment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long paymentId,
			@Valid @RequestBody ReverseOrRefundPaymentRequest request) {
		FeePaymentReceiptResponse reversed = feeService.reversePayment(organizationId, paymentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Fee payment reversed successfully", reversed));
	}

	@RequirePermission(PermissionCode.FEES_REFUND)
	@PostMapping("/fee-payments/{paymentId}/refund")
	public ResponseEntity<ApiResponse<FeePaymentReceiptResponse>> refundPayment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long paymentId,
			@Valid @RequestBody ReverseOrRefundPaymentRequest request) {
		FeePaymentReceiptResponse refunded = feeService.refundPayment(organizationId, paymentId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Fee payment refunded successfully", refunded));
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@GetMapping("/students/{studentId}/financial-profile")
	public ResponseEntity<ApiResponse<StudentFinancialProfileResponse>> getStudentFinancialProfile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam @Positive Long academicSessionId) {
		StudentFinancialProfileResponse profile = feeService.getStudentFinancialProfile(
				organizationId, studentId, academicSessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student financial profile retrieved successfully", profile));
	}

	@RequirePermission(PermissionCode.FEES_REPORT_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/fee-reports/dashboard")
	public ResponseEntity<ApiResponse<SessionFeeDashboardReportResponse>> getSessionFeeDashboardReport(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId) {
		SessionFeeDashboardReportResponse report = feeService.getSessionFeeDashboardReport(organizationId, sessionId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Session fee dashboard report retrieved successfully", report));
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@GetMapping("/academic-sessions/{sessionId}/students/{studentId}/fee-audit-logs")
	public ResponseEntity<ApiResponse<List<FeeAuditLogResponse>>> getStudentAuditLogs(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long sessionId,
			@PathVariable @Positive Long studentId) {
		List<FeeAuditLogResponse> logs = feeService.getStudentAuditLogs(organizationId, sessionId, studentId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Student fee audit logs retrieved successfully", logs));
	}
}

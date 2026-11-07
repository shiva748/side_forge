package com.side.forge.organization.parentportal.controller;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.organization.communication.dto.AnnouncementDtos.AnnouncementResponse;
import com.side.forge.organization.examination.dto.ExaminationResponse.ReportCardResponse;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.FeePaymentReceiptResponse;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse;
import com.side.forge.organization.homework.dto.HomeworkDtos.StudentHomeworkDashboardResponse;
import com.side.forge.organization.homework.dto.HomeworkDtos.StudentHomeworkSubmissionResponse;
import com.side.forge.organization.parentportal.dto.ParentPortalDtos.*;
import com.side.forge.organization.parentportal.service.ParentPortalService;
import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;
import com.side.forge.organization.reporting.service.ReportExportGenerator.ExportDocument;
import com.side.forge.organization.timetable.dto.ClassTimetableResponse;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.PARENT_PORTAL)
@Tag(name = "Parent Portal", description = "Dedicated parent-facing APIs for linked children, dashboard, attendance, homework, exams, fees, timetable, and announcements")
@SecurityRequirement(name = "jwtCookie")
@RequiredArgsConstructor
public class ParentPortalController {

	private final ParentPortalService parentPortalService;

	@GetMapping("/api/me/parent-portal/profile")
	public ResponseEntity<ApiResponse<ParentProfileOverviewResponse>> getParentProfileOverview(
			Authentication authentication) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Parent profile and linked children retrieved successfully",
				parentPortalService.getParentProfileOverview(authentication)));
	}

	@GetMapping("/api/me/parent-portal/children")
	public ResponseEntity<ApiResponse<List<LinkedChildSummaryResponse>>> getAllMyLinkedChildren(
			Authentication authentication) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Linked children across organizations retrieved successfully",
				parentPortalService.getAllMyLinkedChildren(authentication)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/dashboard")
	public ResponseEntity<ApiResponse<ParentDashboardResponse>> getParentDashboard(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Parent dashboard retrieved successfully",
				parentPortalService.getParentDashboard(organizationId, academicSessionId, referenceDate)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children")
	public ResponseEntity<ApiResponse<List<LinkedChildSummaryResponse>>> getLinkedChildren(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Linked children retrieved successfully",
				parentPortalService.getLinkedChildren(organizationId, academicSessionId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/dashboard")
	public ResponseEntity<ApiResponse<ChildDashboardCard>> getChildDashboard(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child dashboard retrieved successfully",
				parentPortalService.getChildDashboard(organizationId, studentId, academicSessionId, referenceDate)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}")
	public ResponseEntity<ApiResponse<ParentChildDetailResponse>> getChildDetails(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child profile details retrieved successfully",
				parentPortalService.getChildDetails(organizationId, studentId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/photo")
	public ResponseEntity<byte[]> downloadChildPhoto(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId) {
		return toFileResponse(parentPortalService.downloadChildPhoto(organizationId, studentId), true);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/documents/{fileId}")
	public ResponseEntity<byte[]> downloadChildDocument(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long fileId) {
		return toFileResponse(parentPortalService.downloadChildDocument(organizationId, studentId, fileId), false);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/attendance")
	public ResponseEntity<ApiResponse<ParentChildAttendanceResponse>> getChildAttendance(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
			@RequestParam(required = false) Integer year,
			@RequestParam(required = false) Integer month) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child attendance retrieved successfully",
				parentPortalService.getChildAttendance(
						organizationId, studentId, academicSessionId, startDate, endDate, year, month)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/homework")
	public ResponseEntity<ApiResponse<StudentHomeworkDashboardResponse>> getChildHomeworkDashboard(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child homework retrieved successfully",
				parentPortalService.getChildHomeworkDashboard(organizationId, studentId, academicSessionId, referenceDate)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/homework/{homeworkId}")
	public ResponseEntity<ApiResponse<ParentChildHomeworkDetailResponse>> getChildHomeworkDetail(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long homeworkId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child homework detail retrieved successfully",
				parentPortalService.getChildHomeworkDetail(organizationId, studentId, homeworkId, referenceDate)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_SUBMIT)
	@PostMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/homework/{homeworkId}/submit")
	public ResponseEntity<ApiResponse<StudentHomeworkSubmissionResponse>> submitChildHomework(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long homeworkId,
			@Valid @RequestBody ParentSubmitHomeworkRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Homework submitted on behalf of student successfully",
				parentPortalService.submitChildHomework(organizationId, studentId, homeworkId, request)));
	}

	@RequirePermission(PermissionCode.HOMEWORK_SUBMIT)
	@PostMapping(value = "/api/organizations/{organizationId}/parent-portal/children/{studentId}/homework/{homeworkId}/submit-file",
			consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<StoredFileResponse>> uploadChildHomeworkSubmissionFile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long homeworkId,
			@RequestParam(required = false) String submissionText,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate submissionDate,
			@RequestParam("file") MultipartFile file) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true,
						"Homework submission file uploaded on behalf of student successfully",
						parentPortalService.uploadChildHomeworkSubmissionFile(
								organizationId, studentId, homeworkId, submissionText, submissionDate, file)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/homework/{homeworkId}/attachments/{fileId}")
	public ResponseEntity<byte[]> downloadChildHomeworkTeacherAttachment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long homeworkId,
			@PathVariable @Positive Long fileId) {
		return toFileResponse(parentPortalService.downloadChildHomeworkTeacherAttachment(
				organizationId, studentId, homeworkId, fileId), false);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/homework/{homeworkId}/submissions/{submissionId}/attachments/{fileId}")
	public ResponseEntity<byte[]> downloadChildHomeworkSubmissionFile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long homeworkId,
			@PathVariable @Positive Long submissionId,
			@PathVariable @Positive Long fileId) {
		return toFileResponse(parentPortalService.downloadChildHomeworkSubmissionFile(
				organizationId, studentId, homeworkId, submissionId, fileId), false);
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/examinations")
	public ResponseEntity<ApiResponse<ParentChildExaminationsResponse>> getChildExaminationsAndResults(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child examination schedules and published results retrieved successfully",
				parentPortalService.getChildExaminationsAndResults(organizationId, studentId, academicSessionId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/examinations/{examinationId}/report-card")
	public ResponseEntity<ApiResponse<ReportCardResponse>> getChildReportCard(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long examinationId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Published report card retrieved successfully",
				parentPortalService.getChildReportCard(organizationId, studentId, examinationId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/examinations/{examinationId}/report-card/download")
	public ResponseEntity<byte[]> downloadChildReportCard(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long examinationId,
			@RequestParam(defaultValue = "PDF") ExportFormat format) {
		return toExportResponse(parentPortalService.downloadChildReportCard(
				organizationId, studentId, examinationId, format));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/fees")
	public ResponseEntity<ApiResponse<ParentConsolidatedFeesResponse>> getConsolidatedFeesOverview(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Consolidated parent fee overview retrieved successfully",
				parentPortalService.getConsolidatedFeesOverview(organizationId, academicSessionId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/fees")
	public ResponseEntity<ApiResponse<StudentFinancialProfileResponse>> getChildFinancialProfile(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child financial profile retrieved successfully",
				parentPortalService.getChildFinancialProfile(
						organizationId, studentId, academicSessionId, startDate, endDate)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/fees/payments/{paymentId}/receipt")
	public ResponseEntity<ApiResponse<FeePaymentReceiptResponse>> getChildPaymentReceipt(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long paymentId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Fee payment receipt retrieved successfully",
				parentPortalService.getChildPaymentReceipt(organizationId, studentId, paymentId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/fees/payments/{paymentId}/receipt/download")
	public ResponseEntity<byte[]> downloadChildPaymentReceipt(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@PathVariable @Positive Long paymentId,
			@RequestParam(defaultValue = "PDF") ExportFormat format) {
		return toExportResponse(parentPortalService.downloadChildPaymentReceipt(
				organizationId, studentId, paymentId, format));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/children/{studentId}/timetable")
	public ResponseEntity<ApiResponse<ClassTimetableResponse>> getChildTimetable(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long studentId,
			@RequestParam(required = false) @Positive Long academicSessionId) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Child timetable retrieved successfully",
				parentPortalService.getChildTimetable(organizationId, studentId, academicSessionId)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/announcements")
	public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> getParentAnnouncements(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) Boolean importantOnly,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {
		return ResponseEntity.ok(new ApiResponse<>(true,
				"Parent announcements retrieved successfully",
				parentPortalService.getParentAnnouncements(organizationId, importantOnly, referenceDate)));
	}

	@RequirePermission(PermissionCode.PARENT_CHILD_VIEW)
	@GetMapping("/api/organizations/{organizationId}/parent-portal/announcements/{announcementId}/attachments/{fileId}")
	public ResponseEntity<byte[]> downloadParentAnnouncementAttachment(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long announcementId,
			@PathVariable @Positive Long fileId) {
		return toFileResponse(parentPortalService.downloadParentAnnouncementAttachment(
				organizationId, announcementId, fileId), false);
	}

	private static ResponseEntity<byte[]> toFileResponse(DownloadedFilePayload payload, boolean inline) {
		ContentDisposition cd = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
				.filename(payload.metadata().originalFilename(), StandardCharsets.UTF_8)
				.build();
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(payload.metadata().contentType()))
				.contentLength(payload.content().length)
				.header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
				.body(payload.content());
	}

	private static ResponseEntity<byte[]> toExportResponse(ExportDocument doc) {
		ContentDisposition cd = ContentDisposition.attachment()
				.filename(doc.filename(), StandardCharsets.UTF_8)
				.build();
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(doc.contentType()))
				.contentLength(doc.content().length)
				.header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
				.body(doc.content());
	}
}

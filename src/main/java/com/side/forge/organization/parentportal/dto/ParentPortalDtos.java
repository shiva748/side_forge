package com.side.forge.organization.parentportal.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.side.forge.notification.dto.NotificationDtos.NotificationResponse;
import com.side.forge.organization.attendance.dto.AttendanceAuditLogResponse;
import com.side.forge.organization.attendance.dto.StudentAttendanceResponse;
import com.side.forge.organization.attendance.dto.StudentAttendanceSummaryResponse;
import com.side.forge.organization.communication.dto.AnnouncementDtos.AnnouncementResponse;
import com.side.forge.organization.examination.dto.ExaminationResponse;
import com.side.forge.organization.examination.dto.ExaminationResponse.ReportCardResponse;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.FeePaymentReceiptResponse;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse;
import com.side.forge.organization.fees.entity.OfflinePaymentSubmissionStatus;
import com.side.forge.organization.fees.entity.PaymentMethod;
import com.side.forge.organization.homework.dto.HomeworkDtos.StudentHomeworkSubmissionResponse;
import com.side.forge.organization.student.enrollment.dto.StudentEnrollmentResponse;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.guardian.dto.StudentGuardianResponse;
import com.side.forge.organization.student.guardian.entity.GuardianRelationshipType;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.user.dto.UserResponse;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ParentPortalDtos {

	private ParentPortalDtos() {
	}

	public record LinkedChildSummaryResponse(
			Long studentId,
			Long organizationId,
			String organizationName,
			String admissionNumber,
			String firstName,
			String middleName,
			String lastName,
			String fullName,
			Gender gender,
			LocalDate dateOfBirth,
			StudentStatus studentStatus,
			Long profilePhotoFileId,
			String profilePhotoUrl,
			GuardianRelationshipType relationshipType,
			boolean primaryContact,
			boolean emergencyContact,
			boolean receiveNotifications,
			Long academicSessionId,
			String academicSessionName,
			Long classId,
			String className,
			String rollNumber,
			EnrollmentStatus enrollmentStatus
	) {
	}

	public record ChildDashboardCard(
			LinkedChildSummaryResponse child,
			StudentAttendanceSummaryResponse attendanceSummary,
			List<StudentAttendanceResponse> recentAttendance,
			int pendingHomeworkCount,
			int overdueHomeworkCount,
			int submittedHomeworkCount,
			int evaluatedHomeworkCount,
			List<StudentHomeworkSubmissionResponse> upcomingHomeworkDeadlines,
			List<ExaminationResponse> upcomingExaminations,
			List<ReportCardResponse> recentlyPublishedResults,
			BigDecimal totalNetPayableFees,
			BigDecimal totalPaidFees,
			BigDecimal outstandingFeeDues,
			BigDecimal overdueFeeDues,
			List<FeePaymentReceiptResponse> recentPayments
	) {
	}

	public record ParentDashboardResponse(
			Long organizationId,
			String organizationName,
			Long guardianId,
			String guardianName,
			String guardianEmail,
			String guardianPhone,
			Long academicSessionId,
			String academicSessionName,
			LocalDate referenceDate,
			int totalLinkedChildren,
			int totalPendingHomeworkCount,
			int totalUpcomingExaminationsCount,
			BigDecimal totalOutstandingFeeDues,
			long unreadNotificationCount,
			List<ChildDashboardCard> children,
			List<AnnouncementResponse> recentAnnouncements,
			List<NotificationResponse> recentNotifications
	) {
	}

	public record ParentChildDetailResponse(
			StudentResponse profile,
			Long profilePhotoFileId,
			String profilePhotoUrl,
			GuardianRelationshipType callerRelationshipType,
			StudentEnrollmentResponse currentEnrollment,
			List<StudentEnrollmentResponse> enrollmentHistory,
			List<StudentGuardianResponse> guardians,
			List<StoredFileResponse> documents
	) {
	}

	public record MonthlyAttendanceSummaryItem(
			String yearMonth,
			int applicableWorkingDays,
			int presentCount,
			int absentCount,
			int lateCount,
			int halfDayCount,
			int excusedDays,
			int holidayDays,
			double attendancePercentage
	) {
	}

	public record ParentChildAttendanceResponse(
			Long studentId,
			String admissionNumber,
			String studentName,
			Long academicSessionId,
			String academicSessionName,
			StudentAttendanceSummaryResponse overallSummary,
			List<MonthlyAttendanceSummaryItem> monthlySummaries,
			List<StudentAttendanceResponse> dailyRecords,
			List<AttendanceAuditLogResponse> recentAttendanceUpdates
	) {
	}

	public record ParentChildHomeworkDetailResponse(
			StudentHomeworkSubmissionResponse submission,
			List<StoredFileResponse> teacherAttachments,
			List<StoredFileResponse> studentSubmissionFiles
	) {
	}

	public record ParentSubmitHomeworkRequest(
			@Size(max = 4000)
			String submissionText,

			List<String> attachments,

			LocalDate submissionDate
	) {
	}

	public record ParentChildExaminationsResponse(
			Long studentId,
			String admissionNumber,
			String studentName,
			Long academicSessionId,
			String academicSessionName,
			Long classId,
			String className,
			List<ExaminationResponse> upcomingExaminations,
			List<ReportCardResponse> publishedResults
	) {
	}

	public record ParentConsolidatedFeesResponse(
			Long organizationId,
			Long academicSessionId,
			String academicSessionName,
			BigDecimal totalBaseAmount,
			BigDecimal totalConcessionAmount,
			BigDecimal totalLateFeeAmount,
			BigDecimal totalNetPayableAmount,
			BigDecimal totalPaidAmount,
			BigDecimal totalUnappliedCreditAmount,
			BigDecimal totalOutstandingAmount,
			BigDecimal totalOverdueAmount,
			List<StudentFinancialProfileResponse> childrenFinancialProfiles
	) {
	}

	public record ParentProfileOverviewResponse(
			UserResponse userProfile,
			List<LinkedChildSummaryResponse> linkedChildren
	) {
	}

	public record SchoolOfflinePaymentInstructionsResponse(
			Long organizationId,
			String organizationName,
			String payeeName,
			String upiId,
			String bankName,
			String accountNumber,
			String ifscCode,
			String branchOrAddress,
			String contactEmail,
			String contactPhone,
			List<PaymentMethod> supportedMethods,
			String instructionsNote
	) {
	}

	public record SubmitOfflineFeePaymentRequest(
			Long academicSessionId,

			@NotNull(message = "Payment date is required")
			LocalDate paymentDate,

			@NotNull(message = "Payment amount is required")
			@DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
			BigDecimal amount,

			@NotNull(message = "Payment method is required")
			PaymentMethod paymentMethod,

			@NotBlank(message = "UTR or transaction reference number is required")
			@Size(max = 100, message = "UTR or transaction reference number must be at most 100 characters")
			String utrOrReferenceNumber,

			List<Long> targetDemandIds,

			@Size(max = 500, message = "Remarks must be at most 500 characters")
			String remarks
	) {
	}

	public record ParentFeePaymentSubmissionResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			String academicSessionName,
			Long studentId,
			String admissionNumber,
			String studentName,
			Long enrollmentId,
			Long submittedByUserId,
			LocalDate paymentDate,
			BigDecimal amount,
			PaymentMethod paymentMethod,
			String utrOrReferenceNumber,
			List<Long> targetDemandIds,
			String remarks,
			OfflinePaymentSubmissionStatus status,
			Long reviewedBy,
			Instant reviewedAt,
			String reviewRemarks,
			Long approvedPaymentId,
			String approvedReceiptNumber,
			List<StoredFileResponse> proofFiles,
			Instant createdAt
	) {
	}

	public record ParentChildOfflinePaymentOverviewResponse(
			Long studentId,
			String studentName,
			Long academicSessionId,
			String academicSessionName,
			SchoolOfflinePaymentInstructionsResponse paymentInstructions,
			List<ParentFeePaymentSubmissionResponse> submissions
	) {
	}
}

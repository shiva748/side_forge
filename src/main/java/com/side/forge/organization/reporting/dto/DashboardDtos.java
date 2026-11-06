package com.side.forge.organization.reporting.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.examination.entity.ExaminationStatus;
import com.side.forge.organization.examination.entity.ExaminationType;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.FeePaymentReceiptResponse;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.ClassFeeReportItem;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.MonthlyFeeCollectionItem;
import com.side.forge.organization.reporting.entity.NoticeAudience;
import com.side.forge.organization.teacher.dto.TeacherClassAssignmentResponse;
import com.side.forge.organization.teacher.dto.TeacherSubjectAssignmentResponse;
import com.side.forge.organization.timetable.dto.TimetableSlotResponse;

import jakarta.validation.constraints.NotBlank;

public final class DashboardDtos {

	private DashboardDtos() {
	}

	public enum DateRangePreset {
		TODAY,
		THIS_WEEK,
		THIS_MONTH,
		SELECTED_MONTH,
		CUSTOM,
		SESSION
	}

	public enum AcademicSessionScope {
		CURRENT,
		PREVIOUS,
		SPECIFIC
	}

	public record ChartSeriesPoint(
			String label,
			BigDecimal value,
			BigDecimal secondaryValue,
			String category
	) {
	}

	public record ChartDatasetResponse(
			String chartKey,
			String title,
			String chartType,
			boolean empty,
			String emptyMessage,
			List<ChartSeriesPoint> points
	) {
	}

	public record FutureModuleWidgetResponse(
			String moduleCode,
			String moduleName,
			boolean available,
			String statusMessage,
			Map<String, Object> metrics
	) {
	}

	public record CreateSchoolNoticeRequest(
			Long academicSessionId,
			@NotBlank(message = "Notice title is required")
			String title,
			@NotBlank(message = "Notice content is required")
			String content,
			NoticeAudience audience,
			Boolean important,
			LocalDate publishedDate
	) {
	}

	public record SchoolNoticeResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			String title,
			String content,
			NoticeAudience audience,
			boolean important,
			LocalDate publishedDate,
			boolean active,
			Long createdBy,
			Instant createdAt
	) {
	}

	public record SchoolActivityItem(
			String activityType,
			String module,
			String summary,
			Instant occurredAt,
			Long performedBy
	) {
	}

	public record DailyAttendanceSnapshot(
			LocalDate date,
			int totalCount,
			int markedCount,
			int presentCount,
			int absentCount,
			int lateCount,
			int halfDayCount,
			int leaveOrExcusedCount,
			int holidayCount,
			double attendancePercentage
	) {
	}

	public record UpcomingExaminationSummary(
			Long examinationId,
			String examinationName,
			ExaminationType examType,
			ExaminationStatus status,
			Long classId,
			String className,
			LocalDate startDate,
			LocalDate endDate,
			int scheduledSubjectsCount
	) {
	}

	public record PublishedExamResultOverview(
			Long examinationId,
			String examinationName,
			ExaminationType examType,
			ExaminationStatus status,
			boolean officialResult,
			Long classId,
			String className,
			int totalEvaluatedStudents,
			int passedCount,
			int failedCount,
			double passPercentage,
			BigDecimal classAveragePercentage,
			Instant publishedAt
	) {
	}

	public record FinancialOverviewSnapshot(
			BigDecimal totalFeesDemanded,
			BigDecimal totalBaseAmount,
			BigDecimal totalConcessionsAndWaivers,
			BigDecimal totalLateFees,
			BigDecimal totalFeesCollected,
			BigDecimal totalRefunded,
			BigDecimal unappliedCredit,
			BigDecimal outstandingFeeAmount,
			BigDecimal overdueFeeAmount
	) {
	}

	public record ClassStrengthAndAttendanceItem(
			Long classId,
			String classCode,
			String className,
			int activeStudentCount,
			double attendancePercentage,
			BigDecimal averageAcademicPercentage
	) {
	}

	public record LowAttendanceStudentItem(
			Long studentId,
			String admissionNumber,
			String studentName,
			Long classId,
			String className,
			int applicableWorkingDays,
			int presentDays,
			int absentDays,
			int lateDays,
			double attendancePercentage
	) {
	}

	public record StudentAcademicAttentionItem(
			Long studentId,
			String admissionNumber,
			String studentName,
			Long classId,
			String className,
			Long examinationId,
			String examinationName,
			BigDecimal percentage,
			String overallGrade,
			boolean overallPassed,
			String attentionReason
	) {
	}

	public record ConcessionWaiverSummary(
			int activeConcessionRulesCount,
			int studentsWithConcessionsCount,
			int waivedDemandsCount,
			BigDecimal totalConcessionAndWaiverAmount,
			Map<String, BigDecimal> amountByConcessionType
	) {
	}

	public record TeacherAttendanceTaskItem(
			Long classId,
			String classCode,
			String className,
			boolean classTeacher,
			LocalDate date,
			int totalEnrolledStudents,
			int markedCount,
			int pendingCount,
			boolean completed
	) {
	}

	public record AdminDashboardResponse(
			Long organizationId,
			String organizationName,
			Long currentAcademicSessionId,
			String currentAcademicSessionName,
			AcademicSessionStatus currentAcademicSessionStatus,
			LocalDate referenceDate,
			int totalActiveStudents,
			int totalActiveTeachers,
			int totalActiveNonTeachingStaff,
			int totalActiveStaffAndTeachers,
			int totalClasses,
			DailyAttendanceSnapshot todayStudentAttendance,
			DailyAttendanceSnapshot todayStaffAttendance,
			double overallStudentAttendancePercentage,
			List<UpcomingExaminationSummary> upcomingExaminations,
			List<PublishedExamResultOverview> recentlyPublishedResults,
			FinancialOverviewSnapshot financialSummary,
			List<SchoolActivityItem> recentActivities,
			List<SchoolNoticeResponse> announcements,
			List<ChartDatasetResponse> charts,
			List<FutureModuleWidgetResponse> extensionWidgets,
			boolean emptyState,
			String emptyStateMessage
	) {
	}

	public record PrincipalDashboardResponse(
			Long organizationId,
			String organizationName,
			Long academicSessionId,
			String academicSessionName,
			LocalDate referenceDate,
			double lowAttendanceThreshold,
			double academicAttentionThreshold,
			List<ClassStrengthAndAttendanceItem> classWisePerformanceAndStrength,
			List<LowAttendanceStudentItem> lowAttendanceStudents,
			List<PublishedExamResultOverview> examinationPerformanceOverview,
			List<UpcomingExaminationSummary> upcomingExaminations,
			DailyAttendanceSnapshot todayStaffAttendance,
			double overallStaffAttendancePercentage,
			List<StudentAcademicAttentionItem> studentsRequiringAcademicAttention,
			List<SchoolNoticeResponse> importantSchoolNotices,
			List<ChartDatasetResponse> charts,
			List<FutureModuleWidgetResponse> extensionWidgets,
			boolean emptyState,
			String emptyStateMessage
	) {
	}

	public record AccountantDashboardResponse(
			Long organizationId,
			String organizationName,
			Long academicSessionId,
			String academicSessionName,
			LocalDate referenceDate,
			BigDecimal totalFeeDemands,
			BigDecimal totalCollection,
			BigDecimal totalRefunded,
			BigDecimal unappliedCredit,
			BigDecimal outstandingFees,
			BigDecimal overdueFees,
			List<MonthlyFeeCollectionItem> monthlyCollectionSummary,
			List<ClassFeeReportItem> classWiseCollection,
			List<FeePaymentReceiptResponse> recentPayments,
			List<FeePaymentReceiptResponse> recentPaymentReceipts,
			ConcessionWaiverSummary concessionsAndWaiversSummary,
			List<ChartDatasetResponse> charts,
			List<FutureModuleWidgetResponse> extensionWidgets,
			boolean emptyState,
			String emptyStateMessage
	) {
	}

	public record TeacherDashboardResponse(
			Long organizationId,
			String organizationName,
			Long academicSessionId,
			String academicSessionName,
			Long teacherId,
			Long staffId,
			String teacherName,
			LocalDate referenceDate,
			List<TeacherClassAssignmentResponse> assignedClasses,
			List<TeacherSubjectAssignmentResponse> assignedSubjects,
			List<TimetableSlotResponse> todayTimetable,
			List<TeacherAttendanceTaskItem> todayAttendanceTasks,
			List<ClassStrengthAndAttendanceItem> assignedClassAttendanceSummary,
			List<UpcomingExaminationSummary> upcomingExaminations,
			FutureModuleWidgetResponse homeworkAndEvaluationWidget,
			List<SchoolNoticeResponse> importantSchoolNotices,
			List<FutureModuleWidgetResponse> extensionWidgets,
			boolean emptyState,
			String emptyStateMessage
	) {
	}
}

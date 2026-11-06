package com.side.forge.organization.reporting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.attendance.dto.StaffAttendanceSummaryResponse;
import com.side.forge.organization.attendance.dto.StudentAttendanceResponse;
import com.side.forge.organization.attendance.dto.StudentAttendanceSummaryResponse;
import com.side.forge.organization.examination.entity.ExaminationStatus;
import com.side.forge.organization.examination.entity.ExaminationType;
import com.side.forge.organization.fees.dto.GenerateFeeDemandsRequest.StudentFeeDemandResponse;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.ClassFeeReportItem;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.MonthlyFeeCollectionItem;
import com.side.forge.organization.fees.entity.PaymentMethod;
import com.side.forge.organization.reporting.dto.DashboardDtos.AcademicSessionScope;
import com.side.forge.organization.reporting.dto.DashboardDtos.ChartDatasetResponse;
import com.side.forge.organization.reporting.dto.DashboardDtos.ConcessionWaiverSummary;
import com.side.forge.organization.reporting.dto.DashboardDtos.DailyAttendanceSnapshot;
import com.side.forge.organization.reporting.dto.DashboardDtos.DateRangePreset;
import com.side.forge.organization.reporting.dto.DashboardDtos.LowAttendanceStudentItem;
import com.side.forge.organization.reporting.dto.DashboardDtos.PublishedExamResultOverview;
import com.side.forge.organization.reporting.dto.DashboardDtos.StudentAcademicAttentionItem;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.StudentStatus;

public final class ReportDtos {

	private ReportDtos() {
	}

	public enum ExportFormat {
		CSV,
		EXCEL,
		PDF
	}

	public record AppliedReportFilters(
			Long organizationId,
			String organizationName,
			Long academicSessionId,
			String academicSessionName,
			AcademicSessionScope sessionScope,
			DateRangePreset datePreset,
			LocalDate startDate,
			LocalDate endDate,
			String selectedMonth,
			Long classId,
			Long examinationId,
			Long studentId,
			Long staffId,
			Double threshold
	) {
	}

	public record ClassStudentCountItem(
			Long classId,
			String classCode,
			String className,
			int activeEnrolledCount,
			int withdrawnOrInactiveCount,
			int totalEnrolledCount
	) {
	}

	public record SessionEnrollmentCountItem(
			Long academicSessionId,
			String academicSessionName,
			int activeCount,
			int transferredCount,
			int withdrawnCount,
			int completedCount,
			int totalCount
	) {
	}

	public record StudentReportRecordItem(
			Long studentId,
			String admissionNumber,
			String fullName,
			Gender gender,
			LocalDate dateOfBirth,
			LocalDate admissionDate,
			StudentStatus studentStatus,
			Long enrollmentId,
			Long classId,
			String className,
			String rollNumber,
			LocalDate enrollmentDate,
			EnrollmentStatus enrollmentStatus,
			String remarks,
			List<String> missingProfileFields
	) {
	}

	public record StudentEnrollmentReportResponse(
			AppliedReportFilters filters,
			int totalActiveStudents,
			int totalInactiveOrWithdrawnStudents,
			Map<StudentStatus, Integer> studentStatusDistribution,
			List<ClassStudentCountItem> classWiseStudentCounts,
			List<SessionEnrollmentCountItem> sessionWiseEnrollments,
			List<StudentReportRecordItem> newAdmissionsInPeriod,
			List<StudentReportRecordItem> withdrawalsAndInactiveRecords,
			Map<Gender, Integer> genderDistribution,
			List<StudentReportRecordItem> studentsWithIncompleteProfile,
			List<StudentReportRecordItem> enrollmentChangesInSession,
			PagedResponse<StudentReportRecordItem> studentDirectoryPage,
			List<ChartDatasetResponse> charts,
			boolean emptyState,
			String emptyStateMessage
	) {
	}

	public record MonthlyAttendanceTrendItem(
			String yearMonth,
			int totalRecords,
			int applicableWorkingDays,
			int presentCount,
			int absentCount,
			int lateCount,
			int halfDayCount,
			double attendancePercentage
	) {
	}

	public record ClassAttendancePercentageItem(
			Long classId,
			String classCode,
			String className,
			int enrolledStudents,
			int totalApplicableDays,
			int presentCount,
			int absentCount,
			int lateCount,
			int halfDayCount,
			double attendancePercentage
	) {
	}

	public record AttendanceReportResponse(
			AppliedReportFilters filters,
			DailyAttendanceSnapshot dailyStudentSummary,
			DailyAttendanceSnapshot dailyStaffSummary,
			List<MonthlyAttendanceTrendItem> monthlyAttendanceSummaries,
			List<ClassAttendancePercentageItem> classWiseAttendancePercentages,
			PagedResponse<StudentAttendanceSummaryResponse> studentAttendanceSummariesPage,
			List<StudentAttendanceResponse> studentAttendanceHistory,
			List<StaffAttendanceSummaryResponse> staffAttendanceSummaries,
			List<StudentAttendanceResponse> absentStudentReport,
			List<StudentAttendanceResponse> lateArrivalReport,
			List<LowAttendanceStudentItem> studentsBelowThreshold,
			List<DailyAttendanceSnapshot> dailyAttendanceTrends,
			List<ChartDatasetResponse> charts,
			boolean emptyState,
			String emptyStateMessage
	) {
	}

	public record SubjectPerformanceSummaryItem(
			Long examinationId,
			String examinationName,
			Long classId,
			String className,
			Long subjectId,
			String subjectCode,
			String subjectName,
			BigDecimal maxMarks,
			BigDecimal passMarks,
			int evaluatedStudents,
			int passedCount,
			int failedCount,
			int absentCount,
			BigDecimal averageMarks,
			BigDecimal averagePercentage,
			double passPercentage
	) {
	}

	public record ClassAcademicPerformanceItem(
			Long classId,
			String classCode,
			String className,
			int finalizedOrPublishedExamsCount,
			int totalResultRecords,
			int passedRecords,
			int failedRecords,
			double passPercentage,
			BigDecimal averagePercentage
	) {
	}

	public record StudentAcademicHistoryItem(
			Long studentId,
			String admissionNumber,
			String studentName,
			Long examinationId,
			String examinationName,
			ExaminationType examType,
			ExaminationStatus status,
			boolean officialResult,
			Long classId,
			String className,
			BigDecimal totalObtainedMarks,
			BigDecimal totalMaxMarks,
			BigDecimal percentage,
			String overallGrade,
			boolean overallPassed
	) {
	}

	public record ExamComparisonItem(
			Long examinationId,
			String examinationName,
			ExaminationType examType,
			ExaminationStatus status,
			boolean officialResult,
			Long classId,
			String className,
			LocalDate startDate,
			BigDecimal averagePercentage,
			double passPercentage,
			int evaluatedStudents
	) {
	}

	public record ExaminationPerformanceReportResponse(
			AppliedReportFilters filters,
			boolean officialResultsOnly,
			int totalOfficialExamsCount,
			int totalDraftOrInProgressExamsCount,
			int totalEvaluatedRecords,
			int totalPassedCount,
			int totalFailedCount,
			double overallPassPercentage,
			BigDecimal overallAveragePercentage,
			List<PublishedExamResultOverview> examinationWiseResultSummaries,
			List<ClassAcademicPerformanceItem> classWiseAveragePerformance,
			List<SubjectPerformanceSummaryItem> subjectWiseAverageMarks,
			List<StudentAcademicHistoryItem> studentAcademicPerformanceHistory,
			Map<String, Integer> gradeDistribution,
			List<StudentAcademicAttentionItem> studentsRequiringAcademicAttention,
			List<ExamComparisonItem> examComparisonAndTrends,
			List<ChartDatasetResponse> charts,
			boolean emptyState,
			String emptyStateMessage
	) {
	}

	public record StudentFeeStatementSummaryItem(
			Long studentId,
			String admissionNumber,
			String studentName,
			Long classId,
			String className,
			BigDecimal totalBaseAmount,
			BigDecimal totalConcessionAmount,
			BigDecimal totalLateFeeAmount,
			BigDecimal totalNetPayableAmount,
			BigDecimal totalPaidAmount,
			BigDecimal unappliedCreditAmount,
			BigDecimal totalOutstandingAmount,
			BigDecimal totalOverdueAmount,
			int pendingOrPartialDemandsCount
	) {
	}

	public record DateRangeCollectionSummary(
			LocalDate startDate,
			LocalDate endDate,
			int completedPaymentsCount,
			int reversedOrRefundedPaymentsCount,
			BigDecimal grossCollectedAmount,
			BigDecimal refundedAmount,
			BigDecimal netCollectedAmount,
			Map<PaymentMethod, BigDecimal> collectionByPaymentMethod
	) {
	}

	public record FinancialReportResponse(
			AppliedReportFilters filters,
			BigDecimal totalBaseAmount,
			BigDecimal totalConcessionAmount,
			BigDecimal totalLateFeeAmount,
			BigDecimal totalFeesDemanded,
			BigDecimal totalAmountCollected,
			BigDecimal totalRefundedAmount,
			BigDecimal totalUnappliedCredit,
			BigDecimal totalOutstandingAmount,
			BigDecimal totalOverdueAmount,
			BigDecimal monthlyFeeDemanded,
			BigDecimal monthlyFeeCollected,
			BigDecimal monthlyFeeOutstanding,
			BigDecimal yearlyFeeDemanded,
			BigDecimal yearlyFeeCollected,
			BigDecimal yearlyFeeOutstanding,
			BigDecimal oneTimeFeeDemanded,
			BigDecimal oneTimeFeeCollected,
			BigDecimal oneTimeFeeOutstanding,
			List<MonthlyFeeCollectionItem> monthlyFeeCollectionTrends,
			List<ClassFeeReportItem> classWiseFeeCollectionAndOutstanding,
			PagedResponse<StudentFeeStatementSummaryItem> studentWiseFeeStatementsPage,
			Map<PaymentMethod, BigDecimal> paymentMethodWiseCollection,
			ConcessionWaiverSummary concessionsAndWaivers,
			List<StudentFeeDemandResponse> partialAndUnpaidFeeDemands,
			DateRangeCollectionSummary dateRangeCollectionSummary,
			List<ChartDatasetResponse> charts,
			boolean emptyState,
			String emptyStateMessage
	) {
	}
}

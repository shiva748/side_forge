package com.side.forge.organization.fees.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.side.forge.organization.fees.dto.CreateClassFeeStructureRequest.ClassFeeStructureResponse;
import com.side.forge.organization.fees.dto.GenerateFeeDemandsRequest.ConcessionResponse;
import com.side.forge.organization.fees.dto.GenerateFeeDemandsRequest.StudentFeeDemandResponse;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.FeePaymentReceiptResponse;
import com.side.forge.organization.fees.entity.PaymentMethod;

public record StudentFinancialProfileResponse(
		Long organizationId,
		Long academicSessionId,
		String academicSessionName,
		Long classId,
		String className,
		Long enrollmentId,
		Long studentId,
		String admissionNumber,
		String studentName,
		ClassFeeStructureResponse assignedFeeStructure,
		Integer assignedFeeStructureVersion,
		List<StudentFeeDemandResponse> monthlyDemands,
		List<StudentFeeDemandResponse> yearlyAndOneTimeDemands,
		List<ConcessionResponse> concessions,
		BigDecimal totalBaseFees,
		BigDecimal totalConcessionsAndWaivers,
		BigDecimal totalLateFees,
		BigDecimal totalNetPayableFees,
		BigDecimal totalPaidAmount,
		BigDecimal unappliedAccountCredit,
		BigDecimal totalOutstandingBalance,
		BigDecimal totalOverdueAmount,
		List<FeePaymentReceiptResponse> paymentHistory
) {
	public record ClassFeeReportItem(
			Long classId,
			String className,
			int enrolledStudents,
			BigDecimal totalExpectedFees,
			BigDecimal totalConcessions,
			BigDecimal totalLateFees,
			BigDecimal totalNetDemanded,
			BigDecimal totalCollected,
			BigDecimal totalOutstanding,
			BigDecimal totalOverdue
	) {
	}

	public record MonthlyFeeCollectionItem(
			int billingYear,
			int billingMonth,
			String periodLabel,
			BigDecimal totalDemanded,
			BigDecimal totalCollected,
			BigDecimal totalPending,
			BigDecimal totalOverdue
	) {
	}

	public record SessionFeeDashboardReportResponse(
			Long organizationId,
			Long academicSessionId,
			String academicSessionName,
			BigDecimal totalExpectedBaseFees,
			BigDecimal totalConcessionsAndWaivers,
			BigDecimal totalLateFees,
			BigDecimal totalNetFeesExpected,
			BigDecimal monthlyFeesDemanded,
			BigDecimal monthlyFeesCollected,
			BigDecimal monthlyFeesOutstanding,
			BigDecimal yearlyAndOneTimeFeesDemanded,
			BigDecimal yearlyAndOneTimeFeesCollected,
			BigDecimal yearlyAndOneTimeFeesOutstanding,
			BigDecimal totalCollectedAmount,
			BigDecimal totalUnappliedAccountCredit,
			BigDecimal totalRefundedAmount,
			BigDecimal totalOutstandingFees,
			BigDecimal totalOverdueFees,
			Map<PaymentMethod, BigDecimal> collectionByPaymentMethod,
			List<MonthlyFeeCollectionItem> monthlyCollectionBreakdown,
			List<ClassFeeReportItem> classWiseBreakdown
	) {
	}
}

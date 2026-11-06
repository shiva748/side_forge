package com.side.forge.organization.examination.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.side.forge.organization.examination.dto.EnterMarkRequest.ExamMarkResponse;
import com.side.forge.organization.examination.dto.ScheduleExamSubjectRequest.ExamScheduleResponse;
import com.side.forge.organization.examination.entity.ExaminationStatus;
import com.side.forge.organization.examination.entity.ExaminationType;

public record ExaminationResponse(
		Long id,
		Long organizationId,
		Long academicSessionId,
		String academicSessionName,
		Long classId,
		String className,
		Long gradingScaleId,
		String gradingScaleName,
		String name,
		ExaminationType examType,
		LocalDate startDate,
		LocalDate endDate,
		ExaminationStatus status,
		String instructions,
		Instant finalizedAt,
		Instant publishedAt,
		Long publishedBy,
		List<ExamScheduleResponse> schedules,
		Instant createdAt,
		Instant updatedAt
) {
	public record ReportCardResponse(
			Long examinationId,
			String examinationName,
			ExaminationType examType,
			ExaminationStatus examinationStatus,
			Long academicSessionId,
			String academicSessionName,
			Long classId,
			String className,
			Long studentId,
			String admissionNumber,
			String studentName,
			BigDecimal totalObtainedMarks,
			BigDecimal totalMaxMarks,
			BigDecimal percentage,
			String overallGrade,
			boolean overallPassed,
			List<ExamMarkResponse> subjectMarks
	) {
	}

	public record ClassExamReportResponse(
			Long examinationId,
			String examinationName,
			ExaminationStatus status,
			Long academicSessionId,
			Long classId,
			String className,
			int totalEnrolledStudents,
			int passedStudents,
			int failedStudents,
			double passPercentage,
			Map<String, Integer> gradeDistribution,
			List<ReportCardResponse> studentResults
	) {
	}
}

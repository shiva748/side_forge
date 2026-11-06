package com.side.forge.organization.homework.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.side.forge.organization.homework.entity.HomeworkStatus;
import com.side.forge.organization.homework.entity.HomeworkSubmissionStatus;
import com.side.forge.organization.homework.entity.LateSubmissionPolicy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class HomeworkDtos {

	private HomeworkDtos() {
	}

	public record CreateHomeworkRequest(
			@NotNull(message = "Academic session ID is required")
			@Positive
			Long academicSessionId,

			@NotNull(message = "Class ID is required")
			@Positive
			Long classId,

			@NotNull(message = "Subject ID is required")
			@Positive
			Long subjectId,

			@Positive
			Long teacherId,

			@NotBlank(message = "Homework title is required")
			@Size(max = 200)
			String title,

			@NotBlank(message = "Homework description is required")
			@Size(max = 4000)
			String description,

			@NotNull(message = "Assigned date is required")
			LocalDate assignedDate,

			@NotNull(message = "Submission due date is required")
			LocalDate dueDate,

			@DecimalMin(value = "0.01", message = "Maximum marks must be positive when specified")
			BigDecimal maxMarks,

			Boolean allowResubmission,

			LateSubmissionPolicy lateSubmissionPolicy,

			List<String> referenceAttachments
	) {
	}

	public record UpdateHomeworkRequest(
			@NotBlank(message = "Homework title is required")
			@Size(max = 200)
			String title,

			@NotBlank(message = "Homework description is required")
			@Size(max = 4000)
			String description,

			@NotNull(message = "Assigned date is required")
			LocalDate assignedDate,

			@NotNull(message = "Submission due date is required")
			LocalDate dueDate,

			@DecimalMin(value = "0.01", message = "Maximum marks must be positive when specified")
			BigDecimal maxMarks,

			Boolean allowResubmission,

			LateSubmissionPolicy lateSubmissionPolicy,

			List<String> referenceAttachments,

			HomeworkStatus status
	) {
	}

	public record SubmitHomeworkRequest(
			@Positive
			Long studentId,

			@Size(max = 4000)
			String submissionText,

			List<String> attachments,

			LocalDate submissionDate
	) {
	}

	public record EvaluateHomeworkSubmissionRequest(
			@DecimalMin(value = "0.0", message = "Marks awarded cannot be negative")
			BigDecimal marksAwarded,

			@Size(max = 2000)
			String feedback
	) {
	}

	public record HomeworkAssignmentResponse(
			Long id,
			Long organizationId,
			Long academicSessionId,
			String academicSessionName,
			Long classId,
			String className,
			Long subjectId,
			String subjectCode,
			String subjectName,
			Long teacherId,
			String teacherName,
			String title,
			String description,
			LocalDate assignedDate,
			LocalDate dueDate,
			BigDecimal maxMarks,
			boolean allowResubmission,
			LateSubmissionPolicy lateSubmissionPolicy,
			List<String> referenceAttachments,
			HomeworkStatus status,
			int totalAssignedStudents,
			int pendingCount,
			int overdueCount,
			int submittedCount,
			int evaluatedCount,
			Instant createdAt,
			Instant updatedAt
	) {
	}

	public record StudentHomeworkSubmissionResponse(
			Long submissionId,
			Long organizationId,
			Long academicSessionId,
			Long homeworkId,
			String homeworkTitle,
			String homeworkDescription,
			Long classId,
			String className,
			Long subjectId,
			String subjectName,
			Long teacherId,
			String teacherName,
			LocalDate assignedDate,
			LocalDate dueDate,
			BigDecimal maxMarks,
			boolean allowResubmission,
			LateSubmissionPolicy lateSubmissionPolicy,
			List<String> referenceAttachments,
			Long enrollmentId,
			Long studentId,
			String admissionNumber,
			String studentName,
			HomeworkSubmissionStatus status,
			String submissionText,
			List<String> submissionAttachments,
			LocalDate submissionDate,
			Instant submittedAt,
			Instant lastResubmittedAt,
			int submissionCount,
			boolean lateSubmission,
			BigDecimal marksAwarded,
			String teacherFeedback,
			Long evaluatedBy,
			Instant evaluatedAt
	) {
	}

	public record TeacherHomeworkDashboardResponse(
			Long organizationId,
			Long academicSessionId,
			Long teacherId,
			String teacherName,
			LocalDate referenceDate,
			int totalAssignmentsCreated,
			int pendingSubmissionsCount,
			int submittedAssignmentsCount,
			int overdueSubmissionsCount,
			int awaitingEvaluationCount,
			int evaluatedSubmissionsCount,
			List<HomeworkAssignmentResponse> assignments
	) {
	}

	public record StudentHomeworkDashboardResponse(
			Long organizationId,
			Long academicSessionId,
			Long studentId,
			String admissionNumber,
			String studentName,
			LocalDate referenceDate,
			int totalAssignedCount,
			int pendingCount,
			int overdueCount,
			int submittedCount,
			int evaluatedCount,
			List<StudentHomeworkSubmissionResponse> assignments
	) {
	}
}

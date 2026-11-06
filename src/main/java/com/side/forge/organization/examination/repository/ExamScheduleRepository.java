package com.side.forge.organization.examination.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.examination.entity.ExamSchedule;

public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {

	Optional<ExamSchedule> findByIdAndOrganizationIdAndExaminationId(
			Long id, Long organizationId, Long examinationId);

	Optional<ExamSchedule> findByOrganizationIdAndExaminationIdAndSubjectId(
			Long organizationId, Long examinationId, Long subjectId);

	List<ExamSchedule> findAllByOrganizationIdAndExaminationIdOrderByExamDateAscStartTimeAsc(
			Long organizationId, Long examinationId);

	List<ExamSchedule> findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndExamDate(
			Long organizationId, Long academicSessionId, Long classId, LocalDate examDate);

	List<ExamSchedule> findAllByOrganizationIdAndAcademicSessionIdAndInvigilatorTeacherIdAndExamDate(
			Long organizationId, Long academicSessionId, Long invigilatorTeacherId, LocalDate examDate);

	boolean existsByOrganizationIdAndExaminationIdAndSubjectId(
			Long organizationId, Long examinationId, Long subjectId);
}

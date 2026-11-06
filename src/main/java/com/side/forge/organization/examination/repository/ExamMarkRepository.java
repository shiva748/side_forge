package com.side.forge.organization.examination.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.examination.entity.ExamMark;

public interface ExamMarkRepository extends JpaRepository<ExamMark, Long> {

	Optional<ExamMark> findByIdAndOrganizationId(Long id, Long organizationId);

	Optional<ExamMark> findByOrganizationIdAndExaminationIdAndSubjectIdAndStudentId(
			Long organizationId, Long examinationId, Long subjectId, Long studentId);

	List<ExamMark> findAllByOrganizationIdAndExaminationIdOrderBySubjectIdAscStudentIdAsc(
			Long organizationId, Long examinationId);

	List<ExamMark> findAllByOrganizationIdAndExaminationIdAndSubjectIdOrderByStudentIdAsc(
			Long organizationId, Long examinationId, Long subjectId);

	List<ExamMark> findAllByOrganizationIdAndExaminationIdAndStudentIdOrderBySubjectIdAsc(
			Long organizationId, Long examinationId, Long studentId);

	boolean existsByOrganizationIdAndExaminationIdAndSubjectIdAndStudentId(
			Long organizationId, Long examinationId, Long subjectId, Long studentId);
}

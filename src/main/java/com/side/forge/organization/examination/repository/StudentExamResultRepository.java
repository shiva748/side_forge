package com.side.forge.organization.examination.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.examination.entity.StudentExamResult;

public interface StudentExamResultRepository extends JpaRepository<StudentExamResult, Long> {

	Optional<StudentExamResult> findByOrganizationIdAndExaminationIdAndStudentId(
			Long organizationId, Long examinationId, Long studentId);

	List<StudentExamResult> findAllByOrganizationIdAndExaminationIdOrderByPercentageDescStudentIdAsc(
			Long organizationId, Long examinationId);

	List<StudentExamResult> findAllByOrganizationIdAndStudentIdOrderByExaminationIdDesc(
			Long organizationId, Long studentId);
}

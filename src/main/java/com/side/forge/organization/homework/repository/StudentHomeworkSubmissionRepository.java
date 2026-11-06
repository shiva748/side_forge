package com.side.forge.organization.homework.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.homework.entity.StudentHomeworkSubmission;

import jakarta.persistence.LockModeType;

public interface StudentHomeworkSubmissionRepository extends JpaRepository<StudentHomeworkSubmission, Long> {

	Optional<StudentHomeworkSubmission> findByIdAndOrganizationId(Long id, Long organizationId);

	Optional<StudentHomeworkSubmission> findByOrganizationIdAndHomeworkIdAndStudentId(
			Long organizationId, Long homeworkId, Long studentId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT s FROM StudentHomeworkSubmission s WHERE s.organizationId = :organizationId AND s.homeworkId = :homeworkId AND s.studentId = :studentId")
	Optional<StudentHomeworkSubmission> findByOrganizationIdAndHomeworkIdAndStudentIdForUpdate(
			@Param("organizationId") Long organizationId,
			@Param("homeworkId") Long homeworkId,
			@Param("studentId") Long studentId);

	List<StudentHomeworkSubmission> findAllByOrganizationIdAndHomeworkIdOrderByStudentIdAsc(
			Long organizationId, Long homeworkId);

	List<StudentHomeworkSubmission> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByIdDesc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<StudentHomeworkSubmission> findAllByOrganizationIdAndStudentIdOrderByIdDesc(
			Long organizationId, Long studentId);

	List<StudentHomeworkSubmission> findAllByOrganizationIdAndAcademicSessionIdOrderByHomeworkIdAscStudentIdAsc(
			Long organizationId, Long academicSessionId);
}

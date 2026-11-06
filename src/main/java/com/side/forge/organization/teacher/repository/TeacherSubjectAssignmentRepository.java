package com.side.forge.organization.teacher.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.teacher.entity.TeacherSubjectAssignment;

public interface TeacherSubjectAssignmentRepository extends JpaRepository<TeacherSubjectAssignment, Long> {

	Optional<TeacherSubjectAssignment> findByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
			Long organizationId, Long academicSessionId, Long classId, Long subjectId, Long teacherId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdOrderByIdAsc(
			Long organizationId, Long academicSessionId, Long classId, Long subjectId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderBySubjectIdAscIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndAcademicSessionIdAndSubjectIdOrderByClassIdAscIdAsc(
			Long organizationId, Long academicSessionId, Long subjectId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscSubjectIdAscIdAsc(
			Long organizationId, Long academicSessionId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescClassIdAscSubjectIdAsc(
			Long organizationId, Long teacherId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAscSubjectIdAsc(
			Long organizationId, Long teacherId, Long academicSessionId);

	List<TeacherSubjectAssignment> findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdAndClassIdOrderBySubjectIdAsc(
			Long organizationId, Long teacherId, Long academicSessionId, Long classId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
			Long organizationId, Long academicSessionId, Long classId, Long subjectId, Long teacherId);
}

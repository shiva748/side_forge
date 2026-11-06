package com.side.forge.organization.teacher.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.teacher.entity.TeacherClassAssignment;

public interface TeacherClassAssignmentRepository extends JpaRepository<TeacherClassAssignment, Long> {

	Optional<TeacherClassAssignment> findByOrganizationIdAndAcademicSessionIdAndClassIdAndTeacherId(
			Long organizationId, Long academicSessionId, Long classId, Long teacherId);

	List<TeacherClassAssignment> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByClassTeacherDescIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	List<TeacherClassAssignment> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscClassTeacherDescIdAsc(
			Long organizationId, Long academicSessionId);

	List<TeacherClassAssignment> findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescClassIdAsc(
			Long organizationId, Long teacherId);

	List<TeacherClassAssignment> findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAsc(
			Long organizationId, Long teacherId, Long academicSessionId);

	List<TeacherClassAssignment> findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndClassTeacherTrue(
			Long organizationId, Long academicSessionId, Long classId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassIdAndTeacherId(
			Long organizationId, Long academicSessionId, Long classId, Long teacherId);
}

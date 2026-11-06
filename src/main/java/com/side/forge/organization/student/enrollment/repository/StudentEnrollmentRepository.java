package com.side.forge.organization.student.enrollment.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;

public interface StudentEnrollmentRepository
		extends JpaRepository<StudentEnrollment, Long>, JpaSpecificationExecutor<StudentEnrollment> {

	Optional<StudentEnrollment> findByIdAndOrganizationId(Long id, Long organizationId);

	List<StudentEnrollment> findAllByOrganizationIdAndStudentIdOrderByEnrollmentDateDescIdDesc(
			Long organizationId, Long studentId);

	Optional<StudentEnrollment> findByOrganizationIdAndAcademicSessionIdAndStudentId(
			Long organizationId, Long academicSessionId, Long studentId);

	List<StudentEnrollment> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	List<StudentEnrollment> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscIdAsc(
			Long organizationId, Long academicSessionId);

	List<StudentEnrollment> findAllByOrganizationIdOrderByAcademicSessionIdDescClassIdAscIdAsc(
			Long organizationId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndStudentId(
			Long organizationId, Long academicSessionId, Long studentId);
}

package com.side.forge.organization.fees.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.fees.entity.StudentFeeAssignment;

public interface StudentFeeAssignmentRepository extends JpaRepository<StudentFeeAssignment, Long> {

	Optional<StudentFeeAssignment> findByOrganizationIdAndEnrollmentIdAndFeeStructureId(
			Long organizationId, Long enrollmentId, Long feeStructureId);

	Optional<StudentFeeAssignment> findFirstByOrganizationIdAndAcademicSessionIdAndStudentIdAndActiveTrueOrderByIdDesc(
			Long organizationId, Long academicSessionId, Long studentId);

	List<StudentFeeAssignment> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByIdDesc(
			Long organizationId, Long academicSessionId, Long studentId);
}

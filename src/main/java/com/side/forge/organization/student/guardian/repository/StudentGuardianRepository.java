package com.side.forge.organization.student.guardian.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.student.guardian.entity.StudentGuardian;

public interface StudentGuardianRepository extends JpaRepository<StudentGuardian, Long> {

	Optional<StudentGuardian> findByOrganizationIdAndStudentIdAndGuardianId(
			Long organizationId, Long studentId, Long guardianId);

	List<StudentGuardian> findAllByOrganizationIdAndStudentIdOrderByPrimaryContactDescIdAsc(
			Long organizationId, Long studentId);

	List<StudentGuardian> findAllByOrganizationIdAndGuardianIdOrderByIdAsc(
			Long organizationId, Long guardianId);

	List<StudentGuardian> findAllByOrganizationIdOrderByStudentIdAscIdAsc(Long organizationId);

	List<StudentGuardian> findAllByOrganizationIdAndStudentIdAndPrimaryContactTrue(
			Long organizationId, Long studentId);

	boolean existsByOrganizationIdAndStudentIdAndGuardianId(
			Long organizationId, Long studentId, Long guardianId);
}

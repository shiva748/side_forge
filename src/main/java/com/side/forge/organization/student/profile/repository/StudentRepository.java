package com.side.forge.organization.student.profile.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.student.profile.entity.Student;

import jakarta.persistence.LockModeType;

public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {

	Optional<Student> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT s FROM Student s WHERE s.id = :id AND s.organizationId = :organizationId")
	Optional<Student> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<Student> findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(
			Long organizationId, Collection<Long> ids);

	List<Student> findAllByOrganizationIdOrderByIdAsc(Long organizationId);

	boolean existsByOrganizationIdAndAdmissionNumberIgnoreCase(Long organizationId, String admissionNumber);

	boolean existsByOrganizationIdAndAdmissionNumberIgnoreCaseAndIdNot(
			Long organizationId, String admissionNumber, Long id);
}

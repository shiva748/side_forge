package com.side.forge.organization.homework.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.homework.entity.HomeworkAssignment;

import jakarta.persistence.LockModeType;

public interface HomeworkAssignmentRepository extends JpaRepository<HomeworkAssignment, Long> {

	Optional<HomeworkAssignment> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT h FROM HomeworkAssignment h WHERE h.id = :id AND h.organizationId = :organizationId")
	Optional<HomeworkAssignment> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<HomeworkAssignment> findAllByOrganizationIdAndAcademicSessionIdOrderByAssignedDateDescIdDesc(
			Long organizationId, Long academicSessionId);

	List<HomeworkAssignment> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByAssignedDateDescIdDesc(
			Long organizationId, Long academicSessionId, Long classId);

	List<HomeworkAssignment> findAllByOrganizationIdAndAcademicSessionIdAndTeacherIdOrderByAssignedDateDescIdDesc(
			Long organizationId, Long academicSessionId, Long teacherId);
}

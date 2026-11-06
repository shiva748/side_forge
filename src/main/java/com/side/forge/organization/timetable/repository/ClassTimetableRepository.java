package com.side.forge.organization.timetable.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.timetable.entity.ClassTimetable;
import com.side.forge.organization.timetable.entity.TimetableStatus;

import jakarta.persistence.LockModeType;

public interface ClassTimetableRepository extends JpaRepository<ClassTimetable, Long> {

	Optional<ClassTimetable> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT t FROM ClassTimetable t WHERE t.id = :id AND t.organizationId = :organizationId")
	Optional<ClassTimetable> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	Optional<ClassTimetable> findByOrganizationIdAndAcademicSessionIdAndClassId(
			Long organizationId, Long academicSessionId, Long classId);

	List<ClassTimetable> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAsc(
			Long organizationId, Long academicSessionId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassId(
			Long organizationId, Long academicSessionId, Long classId);

	boolean existsByOrganizationIdAndTimetableConfigIdAndStatus(
			Long organizationId, Long timetableConfigId, TimetableStatus status);
}

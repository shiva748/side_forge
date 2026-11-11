package com.side.forge.organization.timetable.repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.timetable.entity.TimetableSlot;

public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, Long> {

	Optional<TimetableSlot> findByIdAndOrganizationIdAndClassTimetableId(
			Long id, Long organizationId, Long classTimetableId);

	List<TimetableSlot> findAllByOrganizationIdAndClassTimetableIdOrderByDayOfWeekAscStartTimeAsc(
			Long organizationId, Long classTimetableId);

	List<TimetableSlot> findAllByOrganizationIdAndClassTimetableIdAndDayOfWeekOrderByStartTimeAsc(
			Long organizationId, Long classTimetableId, DayOfWeek dayOfWeek);

	List<TimetableSlot> findAllByOrganizationIdAndClassTimetableIdAndDayOfWeek(
			Long organizationId, Long classTimetableId, DayOfWeek dayOfWeek);

	List<TimetableSlot> findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndDayOfWeek(
			Long organizationId, Long academicSessionId, Long classId, DayOfWeek dayOfWeek);

	List<TimetableSlot> findAllByOrganizationIdAndAcademicSessionIdAndTeacherIdAndDayOfWeek(
			Long organizationId, Long academicSessionId, Long teacherId, DayOfWeek dayOfWeek);

	List<TimetableSlot> findAllByOrganizationIdAndAcademicSessionIdAndTeacherIdOrderByDayOfWeekAscStartTimeAsc(
			Long organizationId, Long academicSessionId, Long teacherId);

	List<TimetableSlot> findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescDayOfWeekAscStartTimeAsc(
			Long organizationId, Long teacherId);

	boolean existsByOrganizationIdAndPeriodId(Long organizationId, Long periodId);

	@Query("""
			SELECT DISTINCT s.teacherId FROM TimetableSlot s
			WHERE s.organizationId = :organizationId AND s.academicSessionId = :academicSessionId
			""")
	Set<Long> findScheduledTeacherIdsInSession(
			@Param("organizationId") Long organizationId,
			@Param("academicSessionId") Long academicSessionId);
}

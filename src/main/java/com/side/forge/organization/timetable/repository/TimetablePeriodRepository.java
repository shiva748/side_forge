package com.side.forge.organization.timetable.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.timetable.entity.TimetablePeriod;

public interface TimetablePeriodRepository extends JpaRepository<TimetablePeriod, Long> {

	Optional<TimetablePeriod> findByIdAndOrganizationIdAndTimetableConfigId(
			Long id, Long organizationId, Long timetableConfigId);

	Optional<TimetablePeriod> findByIdAndOrganizationId(Long id, Long organizationId);

	List<TimetablePeriod> findAllByOrganizationIdAndTimetableConfigIdOrderByPeriodOrderAscStartTimeAsc(
			Long organizationId, Long timetableConfigId);

	List<TimetablePeriod> findAllByOrganizationIdAndIdIn(Long organizationId, Collection<Long> ids);

	boolean existsByOrganizationIdAndTimetableConfigIdAndNameIgnoreCase(
			Long organizationId, Long timetableConfigId, String name);

	boolean existsByOrganizationIdAndTimetableConfigIdAndNameIgnoreCaseAndIdNot(
			Long organizationId, Long timetableConfigId, String name, Long id);

	boolean existsByOrganizationIdAndTimetableConfigIdAndPeriodOrder(
			Long organizationId, Long timetableConfigId, Integer periodOrder);

	boolean existsByOrganizationIdAndTimetableConfigIdAndPeriodOrderAndIdNot(
			Long organizationId, Long timetableConfigId, Integer periodOrder, Long id);
}

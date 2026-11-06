package com.side.forge.organization.attendance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.attendance.entity.StaffAttendance;

public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {

	Optional<StaffAttendance> findByIdAndOrganizationId(Long id, Long organizationId);

	List<StaffAttendance> findAllByOrganizationIdAndAttendanceDateOrderByStaffIdAsc(
			Long organizationId, LocalDate attendanceDate);

	List<StaffAttendance> findAllByOrganizationIdAndStaffIdOrderByAttendanceDateDesc(
			Long organizationId, Long staffId);

	List<StaffAttendance> findAllByOrganizationIdAndAttendanceDateBetweenOrderByAttendanceDateAscStaffIdAsc(
			Long organizationId, LocalDate startDate, LocalDate endDate);

	List<StaffAttendance> findAllByOrganizationIdAndStaffIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(
			Long organizationId, Long staffId, LocalDate startDate, LocalDate endDate);

	boolean existsByOrganizationIdAndStaffIdAndAttendanceDate(
			Long organizationId, Long staffId, LocalDate attendanceDate);
}

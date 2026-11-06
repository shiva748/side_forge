package com.side.forge.organization.attendance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.attendance.entity.StudentAttendance;

public interface StudentAttendanceRepository extends JpaRepository<StudentAttendance, Long> {

	Optional<StudentAttendance> findByIdAndOrganizationId(Long id, Long organizationId);

	List<StudentAttendance> findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndAttendanceDateOrderByStudentIdAsc(
			Long organizationId, Long academicSessionId, Long classId, LocalDate attendanceDate);

	List<StudentAttendance> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByAttendanceDateDescStudentIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	List<StudentAttendance> findAllByOrganizationIdAndAcademicSessionIdOrderByAttendanceDateDescStudentIdAsc(
			Long organizationId, Long academicSessionId);

	List<StudentAttendance> findAllByOrganizationIdAndStudentIdOrderByAttendanceDateDesc(
			Long organizationId, Long studentId);

	List<StudentAttendance> findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByAttendanceDateDesc(
			Long organizationId, Long academicSessionId, Long studentId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndStudentIdAndAttendanceDate(
			Long organizationId, Long academicSessionId, Long studentId, LocalDate attendanceDate);
}

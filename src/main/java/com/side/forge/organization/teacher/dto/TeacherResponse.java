package com.side.forge.organization.teacher.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.student.profile.entity.Gender;

public record TeacherResponse(
		Long id,
		Long organizationId,
		Long staffId,
		Long userId,
		String employeeId,
		String firstName,
		String middleName,
		String lastName,
		LocalDate dateOfBirth,
		Gender gender,
		String email,
		String phoneNumber,
		String alternatePhoneNumber,
		String address,
		String city,
		String state,
		String postalCode,
		LocalDate joiningDate,
		LocalDate leavingDate,
		String designation,
		String department,
		EmploymentType employmentType,
		EmploymentStatus employmentStatus,
		String qualifications,
		String specialization,
		Integer experienceYears,
		String registrationNumber,
		String certifications,
		String teachingNotes,
		boolean availableForAssignment,
		Instant createdAt,
		Instant updatedAt
) {
}

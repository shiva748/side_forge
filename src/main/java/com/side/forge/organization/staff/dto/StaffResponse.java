package com.side.forge.organization.staff.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.student.profile.entity.Gender;

public record StaffResponse(
		Long id,
		Long organizationId,
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
		String emergencyContactName,
		String emergencyContactPhone,
		String emergencyContactRelation,
		boolean teachingStaff,
		String professionalNotes,
		Instant createdAt,
		Instant updatedAt
) {
}

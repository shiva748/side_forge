package com.side.forge.organization.student.profile.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.StudentStatus;

public record StudentResponse(
		Long id,
		Long organizationId,
		Long userId,
		String admissionNumber,
		String firstName,
		String middleName,
		String lastName,
		LocalDate dateOfBirth,
		Gender gender,
		String email,
		String phoneNumber,
		String address,
		String city,
		String state,
		String postalCode,
		LocalDate admissionDate,
		String bloodGroup,
		String nationality,
		StudentStatus status,
		Instant createdAt,
		Instant updatedAt
) {
}

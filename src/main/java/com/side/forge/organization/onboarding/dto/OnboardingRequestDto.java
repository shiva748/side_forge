package com.side.forge.organization.onboarding.dto;

import com.side.forge.organization.entity.BoardAffiliation;
import com.side.forge.organization.entity.CurrentManagementSystem;
import com.side.forge.organization.entity.StudentStrength;
import jakarta.validation.constraints.*;

public record OnboardingRequestDto(

		@NotBlank @Size(max = 150) String schoolName,

		@NotNull BoardAffiliation boardAffiliation,

		@NotBlank @Email @Size(max = 255) String schoolEmail,

		@NotBlank @Size(max = 20) String schoolPhone,

		@NotBlank @Size(max = 500) String address,

		@NotBlank @Size(max = 100) String city,

		@NotBlank @Size(max = 100) String state,

		@NotBlank @Pattern(regexp = "^[0-9]{6}$") String postalCode,

		@NotBlank @Size(max = 150) String contactPersonName,

		@NotBlank @Size(max = 100) String designation,

		@NotBlank @Email @Size(max = 255) String contactEmail,

		@NotBlank @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit Indian mobile number") String mobileNumber,

		@NotNull StudentStrength studentStrength,

		@NotNull @Min(1) Integer campusCount,

		@NotNull CurrentManagementSystem managementSystem,

		@Size(max = 2000) String additionalRequirements

) {
}


package com.side.forge.organization.onboarding.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.onboarding.dto.OnboardingRequestDto;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;

@Mapper(componentModel = "spring")
public interface OnboardingMapper {

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "requestedBy", ignore = true)
	@Mapping(target = "reviewedBy", ignore = true)
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "rejectionReason", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	OnboardingRequest toEntity(OnboardingRequestDto dto);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "name", source = "schoolName")
	@Mapping(target = "email", source = "schoolEmail")
	@Mapping(target = "phoneNumber", source = "schoolPhone")
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Organization toOrganization(OnboardingRequest request);
}

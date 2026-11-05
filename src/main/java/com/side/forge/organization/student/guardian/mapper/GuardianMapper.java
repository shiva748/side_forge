package com.side.forge.organization.student.guardian.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.student.guardian.dto.CreateGuardianRequest;
import com.side.forge.organization.student.guardian.dto.GuardianResponse;
import com.side.forge.organization.student.guardian.entity.Guardian;

@Mapper(componentModel = "spring")
public interface GuardianMapper {

	GuardianResponse toResponse(Guardian guardian);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "active", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Guardian toEntity(CreateGuardianRequest request);
}

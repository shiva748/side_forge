package com.side.forge.organization.academic.schoolclass.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.academic.schoolclass.dto.CreateSchoolClassRequest;
import com.side.forge.organization.academic.schoolclass.dto.SchoolClassResponse;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;

@Mapper(componentModel = "spring")
public interface SchoolClassMapper {

	SchoolClassResponse toResponse(SchoolClass schoolClass);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "active", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	SchoolClass toEntity(CreateSchoolClassRequest request);
}

package com.side.forge.organization.academic.section.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.academic.section.dto.CreateSectionRequest;
import com.side.forge.organization.academic.section.dto.SectionResponse;
import com.side.forge.organization.academic.section.entity.Section;

@Mapper(componentModel = "spring")
public interface SectionMapper {

	SectionResponse toResponse(Section section);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "academicSessionId", ignore = true)
	@Mapping(target = "active", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Section toEntity(CreateSectionRequest request);
}

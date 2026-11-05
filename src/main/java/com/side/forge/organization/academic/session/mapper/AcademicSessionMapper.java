package com.side.forge.organization.academic.session.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.academic.session.dto.AcademicSessionResponse;
import com.side.forge.organization.academic.session.dto.CreateAcademicSessionRequest;
import com.side.forge.organization.academic.session.entity.AcademicSession;

@Mapper(componentModel = "spring")
public interface AcademicSessionMapper {

	AcademicSessionResponse toResponse(AcademicSession session);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "startDate", ignore = true)
	@Mapping(target = "endDate", ignore = true)
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "activeOrganizationId", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	AcademicSession toEntity(CreateAcademicSessionRequest request);
}
